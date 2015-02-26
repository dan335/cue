// Cue - cue contains jobs
// Job - different type of jobs - 'sendEmail'
// task - each task - sendEmail('bob')

// TODO: set max time per task in job.  error if taking longer than max time
// TODO: stats, how long each job is taking
// TODO: bool for should there only be on task for a job at a time
// don't insert if there already is one

if (Meteor.isServer) {

    Cue = {

        // per server
        maxTasksAtOnce: 5,

        intervalHandle: null,
        intervalMs: 1000 * 5,
        jobs: [],

        // how many times do we retry a task when there is an error
        // setting job's retryOnError to false cancels this
        maxTaskTries: 3,

        // how many tasks are we currently working on
        // only do maxTasksAtOnce
        numCurrentTasks: 0
    }

    Cue.dropTasks = function() {
        CueTasks.remove({})
    }

    Cue.dropTask = function(taskId) {
        check(taskId, String)
        CueTasks.remove(taskId)
    }

    Cue.start = function() {
        var self = this
        self.stop()

        Meteor.setInterval(function() {
            self._doATask()
        }, self.intervalMs)
    }


    Cue.stop = function() {
        Meteor.clearInterval(this.intervalHandle)
    }

    // retryOnError
    Cue.addJob = function(name, options, jobFunction) {
        check(name, String)
        check(options.retryOnError, Boolean)
        this.jobs.push({name:name, job:jobFunction, retryOnError:options.retryOnError})
    }

    // isAsync - is here instead of on addJob for good reason
    // unique - only allow one of job in queue
    Cue.addTask = function(jobName, options, data) {
        check(jobName, String)
        check(options.isAsync, Boolean)
        check(options.unique, Boolean)
        check(data, Object)

        if (options.unique) {
            if (CueTasks.find({jobName:jobName}).count()) {
                return false
            }
        }

        CueTasks.insert({
            jobName:jobName,
            isAsync:options.isAsync,
            data:data,
            doing:false,
            numTries:0,
            createdAt: new Date()
        })
    }


    Cue._doATask = function() {
        var self = this

        // are we at capacity?
        if (self.numCurrentTasks >= self.maxTasksAtOnce) {
            return
        }

        // get a task
        var task = CueTasks.findAndModify({
            query: {doing:false},
            update: {$set:{doing:true}, $inc:{numTries:1}},
            sort: {createdAt:-1},
            new: true
        })

        if (!task) {
            return
        }

        // find task's job
        var job = _.find(self.jobs,function(j) {
            return j.name == task.jobName
        })

        if (!job) {
            console.error('job '+task.jobName+' not found')
            return
        }

        // if task is synchronous
        if (!task.isAsync) {

            // check to see if task in this job is already running
            if (CueTasks.find({_id: {$ne:task._id}, jobName:job.name, doing:true}).count()) {

                // abort task, one is already running
                CueTasks.update(task._id, {$set:{doing:false}, $inc:{numTries:-1}})

                // try an async one
                // get a task
                var task = CueTasks.findAndModify({
                    query: {doing:false, isAsync:true},
                    update: {$set:{doing:true}, $inc:{numTries:1}},
                    sort: {createdAt:-1},
                    new: true
                })

                if (!task) {
                    return
                }

                // find task's job
                var job = _.find(self.jobs,function(j) {
                    return j.name == task.jobName
                })

                if (!job) {
                    return
                }
            }
        }

        // mark task as doing
        //CueTasks.update(task._id, {$set:{doing:true}, $inc:{numTries:1}})
        self.numCurrentTasks++

        task.startTime = new Date()

        Meteor.defer(function() {
            job.job(task, function(error) {
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

                task.finishTime = new Date()
                Cue.recordFinish(task)
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
    }

    Cue.resetStats = function() {
        CueStats.update({}, {$set: {timesRun:0}}, {multi:true})
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


    // reset stats each day
    var endOfDay = moment().endOf('day')
    var timeUntilMidnight = endOfDay - moment()

    Meteor.setTimeout(function() {
        Meteor.setInterval(function() {
            Cue.resetStats()
        }, 1000 * 60 * 60 * 24)
    }, timeUntilMidnight)
}
