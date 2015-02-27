// cue - cue contains jobs
// job - different type of jobs - 'sendEmail'
// task - each task - sendEmail('bob')

// TODO: catch errors
// TODO: log errors, create template that can view them
// TODO: have a template that lists all jobs and has a button to run one

if (Meteor.isServer) {

    Cue = {

        // per server
        maxTasksAtOnce: 10,

        intervalHandle: null,
        intervalMs: 1000 * 5,
        jobs: [],

        // how many times do we retry a task when there is an error
        // setting job's retryOnError to false cancels this
        maxTaskTries: 3,

        // how many tasks are we currently working on
        // only do maxTasksAtOnce
        numCurrentTasks: 0,


        // cancel any task that isn't finished in this time
        // catches tasks that error and don't return
        maxTime: 1000 * 60 * 30
    }


    Cue.dropTasks = function() {
        CueTasks.remove({})
        self.numCurrentTasks = 0
    }


    Cue.dropTask = function(taskId) {
        check(taskId, String)
        CueTasks.remove(taskId)
        Cue._resetNumCurrentTasks()
    }


    // maybe call before start
    // drop tasks that never ended when app restarted
    Cue.dropInProgressTasks = function() {
        CueTasks.remove({doing:true})
        Cue._resetNumCurrentTasks()
    }


    Cue.restartInProgressTasks = function() {
        CueTasks.update({doing:true}, {$set:{doing:false, numTries:0}})
        Cue._resetNumCurrentTasks()
    }


    // start doing tasks
    Cue.start = function() {
        var self = this
        self.stop()
        self.numCurrentTasks = 0

        Meteor.setInterval(function() {
            self._doATask()
        }, self.intervalMs)
    }


    // stop doing tasks
    Cue.stop = function() {
        Meteor.clearInterval(this.intervalHandle)
        this.numCurrentTasks = 0
    }


    // define a job
    // options
    // retryOnError - if job returns error retry up to max times
    // maxMs - optional, remove job if taking longer than this
    Cue.addJob = function(name, options, jobFunction) {

        var maxMs = options.maxMs || 0
        var retryOnError = options.retryOnError || false

        check(name, String)
        check(retryOnError, Match.OneOf(null, Boolean))
        check(maxMs, Match.OneOf(null, Number))

        if (typeof(jobFunction) != "function") {
            throw new Meteor.Error('Job '+name+"'s function isn't a function.")
        }

        this.jobs.push({
            name:name,
            job:jobFunction,
            retryOnError:retryOnError,
            maxMs: maxMs
            })
    }


    // add a task to the queue
    // options
    // isAsync - true = run multiple tasks of the same type at once
    // unique - only allow one task of each job type in queue
    Cue.addTask = function(jobName, options, data) {

        var isAsync = options.isAsync || false
        var unique = options.unique || false

        check(jobName, String)
        check(isAsync, Match.OneOf(null, Boolean))
        check(unique, Match.OneOf(null, Boolean))
        check(data, Object)

        if (options.unique) {
            if (CueTasks.find({jobName:jobName, data:data}).count()) {
                return false
            }
        }

        CueTasks.insert({
            jobName:jobName,
            isAsync:isAsync,
            data:data,
            doing:false,
            numTries:0,
            createdAt: new Date()
        })
    }


    Cue._getTaskToDo = function() {
        var self = this
        var skipTypes = []
        var tryAgain = true
        var task = null

        do {
            // get a task
            task = CueTasks.findAndModify({
                query: {doing:false, jobName:{$nin:skipTypes}},
                update: {$set:{doing:true}, $inc:{numTries:1}},
                sort: {createdAt:-1},
                new: true
            })

            if (!task) {

                // no tasks to do, stop
                tryAgain = false

            } else {

                // find task's job
                var job = _.find(self.jobs,function(j) {
                    return j.name == task.jobName
                })

                if (!job) {

                    // abort
                    console.error('job '+task.jobName+' not found')
                    tryAgain = false

                } else {

                    if (task.isAsync) {

                        // if task is is async then do task
                        tryAgain = false

                    } else {

                        // if task is sync
                        // check to see if task of this job type is already running
                        if (CueTasks.find({_id: {$ne:task._id}, jobName:job.name, doing:true}).count() == 0) {

                            // if not then do task
                            tryAgain = false

                        } else {

                            // do another type of task, this one is already running
                            CueTasks.update(task._id, {$set:{doing:false}, $inc:{numTries:-1}})
                            skipTypes.push(task.jobName)
                            task = null
                        }
                    }

                }
            }

        }
        while (tryAgain)

        return {task:task, job:job}
    }


    Cue._doATask = function() {
        var self = this

        // are we at capacity?
        if (self.numCurrentTasks >= self.maxTasksAtOnce) {
            return
        }

        // get a task
        var result = Cue._getTaskToDo()
        var task = result.task
        var job = result.job

        if (!task || !job) {
            return
        }

        // mark task as doing
        //CueTasks.update(task._id, {$set:{doing:true}, $inc:{numTries:1}})
        self.numCurrentTasks++

        task.startTime = new Date()

        Meteor.defer(function() {
            // set timer to cancel job
            if (job.maxMs) {
                task.maxMsTimerHandle = Meteor.setTimeout(function() {
                    console.error(' --- ')
                    console.error(task.jobName+' took longer than '+job.maxMs+' and was canceled.')
                    console.error(task)
                    console.error(' --- ')
                    CueTasks.remove(task._id)
                    self.numCurrentTasks--
                    self._doATask()
                }, job.maxMs)
            }

            job.job(task, function(error) {
                // cancel timer to stop job
                if (job.maxMs) {
                    Meteor.clearTimeout(task.maxMsTimerHandle)
                }

                task.finishTime = new Date()
                Cue.recordFinish(task)

                if (error) {
                    console.error(' --- ')
                    console.error(task.jobName+' errored. Try '+task.numTries)
                    console.error(error)
                    console.error(task)
                    console.error(' --- ')

                    task.error = error  // for stats

                    if (job.retryOnError) {
                        if (task.numTries < self.maxTaskTries) {
                            // mark task to be done again
                            CueTasks.update(task._id, {$set:{doing:false, error:error}})
                        } else {
                            CueTasks.remove(task._id)
                        }

                    } else {
                        CueTasks.remove(task._id)
                    }

                } else {
                    CueTasks.remove(task._id)
                }

                self.numCurrentTasks--
                self._doATask()
            })


        })

        if (CueTasks.find().count() > 0) {
            self._doATask()
        }
    }


    Cue.retryTask = function(taskId) {
        CueTasks.update(taskId, {$set:{doing:false, numTries:0, error:undefined, createdAt:new Date()}})
        Cue._resetNumCurrentTasks()
    }


    Cue.resetStats = function() {
        CueStats.remove({})
    }


    Cue.recordFinish = function(task) {
        var runTime = task.finishTime - task.startTime

        CueStats.upsert({
            jobName:task.jobName
        }, {$set: {
            jobName:task.jobName,
            lastRunMs:runTime,
            lastRunDate: new Date()
        }, $inc: {
            timesRunToday:1,
            msToday:runTime
        }})
    }


    Cue._resetNumCurrentTasks = function() {
        Cue.numCurrentTasks = CueTasks.find({doing:true}).count()
    }


    // reset stats each day
    var endOfDay = moment().endOf('day')
    var timeUntilMidnight = endOfDay - moment()

    Meteor.setTimeout(function() {
        Meteor.setInterval(function() {
            Cue.resetStats()
        }, 1000 * 60 * 60 * 24)
    }, timeUntilMidnight)


    //cancel tasks that have been going for 30 min
    Meteor.setInterval(function() {
        var foundTask = false
        var cutoff = moment().subtract(30, 'minutes').toDate()

        CueTasks.find({createdAt: {$lt: cutoff}}).forEach(function(t) {
            console.error(' --- ')
            console.error(t.jobName+' took longer than max time and was canceled.')
            console.error(t)
            console.error(' --- ')

            CueTasks.remove(t._id)
            foundTask = true
        })

        // reset
        if (foundTask) {
            Cue._resetNumCurrentTasks()
        }

    }, Cue.maxTime)

}
