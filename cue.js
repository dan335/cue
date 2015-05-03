// cue - cue contains jobs
// job - different type of jobs - 'sendEmail'
// task - each task - sendEmail('bob')

// TODO: catch errors
// TODO: log errors, create template that can view them

if (Meteor.isServer) {

    //CueData.upsert({name: 'stopped'}, {$set: {name: 'stopped', value: false}})
    var stopped = CueData.findOne({name:'stopped'});
    if (!stopped) {
        CueData.insert({name:'stopped', value:false});
    }

    Cue = {

        // per server
        maxTasksAtOnce: 10,

        intervalHandle: null,
        intervalMs: 1000 * 3,
        jobs: [],

        // how many times do we retry a task when there is an error
        // setting job's retryOnError to false cancels this
        maxTaskTries: 3,

        // cancel any task that isn't finished in this time
        // catches tasks that error and don't return
        maxTime: 1000 * 60 * 30,
    };


    Cue.dropTasks = function() {
        CueTasks.remove({});
    };


    Cue.dropTask = function(taskId) {
        check(taskId, String);
        CueTasks.remove(taskId);
    };


    // call before calling start
    // drop tasks that never ended when app restarted
    Cue.dropInProgressTasks = function() {
        CueTasks.remove({doing:true});
    };


    Cue.restartInProgressTasks = function() {
        CueTasks.update({doing:true}, {$set:{doing:false, numTries:0}});
    };


    // start doing tasks
    Cue.start = function() {
        var self = this;
        self.stop();
        CueData.update({name: 'stopped'}, {$set: {value:false}});

        Meteor.setInterval(function() {
            self._doATask();
        }, self.intervalMs);
    };


    // stop doing tasks
    // this won't stop tasks currently running
    // use before restarting server
    // wait for tasks to finish before restarting
    Cue.stop = function() {
        Meteor.clearInterval(this.intervalHandle);
        CueData.update({name: 'stopped'}, {$set: {value:true}});
    };


    // define a job
    // options
    // retryOnError - if job returns error retry up to max times
    // maxMs - optional, remove job if taking longer than this
    // maxAtOnce - limit number of async tasks of this job running at once
    //      if set to 0 then it uses the global maxTasksAtOnce
    //      should be less than global maxTasksAtOnce
    Cue.addJob = function(name, options, jobFunction) {

        var maxMs = options.maxMs || 0;
        var retryOnError = options.retryOnError || false;
        var maxAtOnce = options.maxAtOnce || 0;

        check(name, String);
        check(retryOnError, Match.OneOf(null, Boolean));
        check(maxMs, Match.OneOf(null, Number));

        if (typeof(jobFunction) != "function") {
            throw new Meteor.Error('Job '+name+"'s function isn't a function.");
        }

        this.jobs.push({
            name:name,
            job:jobFunction,
            retryOnError:retryOnError,
            maxMs: maxMs,
            maxAtOnce: maxAtOnce
            });
    };


    // add a task to the queue
    // options
    // isAsync - true = run multiple tasks of the same type at once
    // unique - only allow one task of each job type in queue
    // delay - delay job for x ms, set to 0 to not delay
    Cue.addTask = function(jobName, options, data) {

        var isAsync = options.isAsync || false;
        var unique = options.unique || false;
        var delay = options.delay || 0;

        check(jobName, String);
        check(isAsync, Match.OneOf(null, Boolean));
        check(unique, Match.OneOf(null, Boolean));
        check(delay, Number);
        check(data, Object);

        if (delay) {
            Meteor.setTimeout(function() {
                Cue.addTask(jobName, {isAsync:isAsync, unique:unique, delay:0}, data);
            }, delay);
            return;
        }

        if (options.unique) {
            CueTasks.upsert({jobName:jobName, data:data}, {$setOnInsert: {
                jobName:jobName,
                isAsync:isAsync,
                data:data,
                doing:false,
                numTries:0,
                createdAt: new Date()
            }});
        } else {
            CueTasks.insert({
                jobName:jobName,
                isAsync:isAsync,
                data:data,
                doing:false,
                numTries:0,
                createdAt: new Date()
            });
        }
    };


    Cue._getTaskToDo = function() {
        var self = this;
        var skipTypes = [];
        var tryAgain = true;
        var task = null;
        var job = null;

        do {
            // get a task
            task = CueTasks.findAndModify({
                query: {doing:false, jobName:{$nin:skipTypes}},
                update: {$set:{doing:true}, $inc:{numTries:1}},
                sort: {createdAt:1},
                new: true
            });

            if (!task) {

                // no tasks to do, stop
                tryAgain = false;

            } else {

                // find task's job
                job = null;
                job = _.find(self.jobs,function(j) {
                    return j.name == task.jobName;
                });

                if (!job) {

                    // abort
                    console.error('job '+task.jobName+' not found');
                    tryAgain = false;

                } else {

                    if (task.isAsync) {

                        // if maxAtOnce is 0 then do task
                        if (job.maxAtOnce === 0) {

                            tryAgain = false;

                        } else {

                            // check maxAtOnce
                            if (CueTasks.find({_id: {$ne:task._id}, jobName:job.name, doing:true}).count()  < job.maxAtOnce) {

                                // do task
                                tryAgain = false;

                            } else {

                                // do another type of task, this one already has maxAtOnce running
                                CueTasks.update(task._id, {$set:{doing:false}, $inc:{numTries:-1}});
                                skipTypes.push(task.jobName);
                                task = null;
                            }
                        }



                    } else {

                        // if task is sync
                        // check to see if task of this job type is already running
                        if (CueTasks.find({_id: {$ne:task._id}, jobName:job.name, doing:true}).count() === 0) {

                            // if not then do task
                            tryAgain = false;

                        } else {

                            // do another type of task, this one is already running
                            CueTasks.update(task._id, {$set:{doing:false}, $inc:{numTries:-1}});
                            skipTypes.push(task.jobName);
                            task = null;
                        }
                    }

                }
            }

        }
        while (tryAgain);

        return {task:task, job:job};
    };


    Cue._doATask = function() {
        var self = this;

        var stopped = CueData.findOne({name:'stopped'});
        if (!stopped) {
            return;
        }
        if (stopped.value) {
            return;
        }

        // are we at capacity?
        var numDoing = CueTasks.find({doing:true}).count();
        if (numDoing >= self.maxTasksAtOnce) {
            return;
        }

        // get a task
        var result = Cue._getTaskToDo();
        var task = result.task;
        var job = result.job;

        if (!task || !job) {
            return;
        }

        task.startTime = new Date();

        Meteor.defer(function() {
            // set timer to cancel job
            if (job.maxMs) {
                task.maxMsTimerHandle = Meteor.setTimeout(function() {
                    console.error(' --- ');
                    console.error(task.jobName+' took longer than '+job.maxMs+' and was canceled.');
                    console.error(task);
                    console.error(' --- ');
                    CueTasks.remove(task._id);
                    self._doATask();
                }, job.maxMs);
            }

            job.job(task, function(error) {
                // cancel timer to stop job
                if (job.maxMs) {
                    Meteor.clearTimeout(task.maxMsTimerHandle);
                }

                task.finishTime = new Date();
                Cue._recordFinish(task);

                if (error) {
                    console.error(' --- ');
                    console.error(task.jobName+' errored. Try '+task.numTries);
                    console.error(error);
                    console.error(task);
                    console.error(' --- ');

                    task.error = error;  // for stats

                    if (job.retryOnError) {
                        if (task.numTries < self.maxTaskTries) {
                            // mark task to be done again
                            CueTasks.update(task._id, {$set:{doing:false, error:error}});
                        } else {
                            CueTasks.remove(task._id);
                        }

                    } else {
                        CueTasks.remove(task._id);
                    }

                } else {
                    CueTasks.remove(task._id);
                }

                self._doATask();
            });


        });

        if (CueTasks.find().count() > 0) {
            self._doATask();
        }
    };


    Cue.retryTask = function(taskId) {
        CueTasks.update(taskId, {$set:{doing:false, numTries:0, error:undefined, createdAt:new Date()}});
    };


    Cue.resetStats = function() {
        CueStats.remove({});
    };


    Cue._recordFinish = function(task) {
        var runTime = task.finishTime - task.startTime;

        CueStats.upsert({
            jobName:task.jobName
        }, {$set: {
            jobName:task.jobName,
            lastRunMs:runTime,
            lastRunDate: new Date()
        }, $inc: {
            timesRunToday:1,
            msToday:runTime
        }});
    };


    // reset stats each day
    var midnight = new Date();
    midnight.setHours(24,0,0,0);
    var timeUntilMidnight = midnight.getTime() - new Date().getTime();

    Meteor.setTimeout(function() {
        Cue.resetStats();
        Meteor.setInterval(function() {
            Cue.resetStats();
        }, 1000 * 60 * 60 * 24);
    }, timeUntilMidnight);


    //cancel tasks that have been going for 30 min
    Meteor.setInterval(function() {
        // now - 30 minutes
        var thirtyMin = 1000 * 60 * 30;
        var cutoff = new Date(new Date().getTime() - thirtyMin);

        CueTasks.find({createdAt: {$lt: cutoff}}).forEach(function(t) {
            console.error(' --- ');
            console.error(t.jobName+' took longer than max time and was canceled.');
            console.error(t);
            console.error(' --- ');

            CueTasks.remove(t._id);
        });

    }, Cue.maxTime);

}
