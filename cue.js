// Cue - cue contains jobs
// Job - different type of jobs - 'sendEmail'
// task - each task - sendEmail('bob')

Cue = function(maxTasksAtOnce) {

    // per server
    this.maxTasksAtOnce = maxTasksAtOnce

    this.intervalHandle = null
    this.intervalMs = 1000 * 5
    this.jobs = []

    // how many times do we retry a task when there is an error
    // setting job's retryOnError to false cancels this
    this.maxTaskTries = 5

    // how many tasks are we currently working on
    // only do maxTasksAtOnce
    this.numCurrentTasks = 0
}

Cue.prototype.dropTasks = function() {
    CueTasks.remove({})
}

Cue.prototype.start = function() {
    var self = this
    self.stop()

    Meteor.setInterval(function() {
        self._doATask()
    }, self.intervalMs)
}

Cue.prototype.stop = function() {
    Meteor.clearInterval(this.intervalHandle)
}

Cue.prototype.addJob = function(name, retryOnError, jobFunction) {
    this.jobs.push({name:name, job:jobFunction, retryOnError:retryOnError})
}

// isAsync is here instead of on addJob for good reason
Cue.prototype.addTask = function(jobName, isAsync, data) {
    check(jobName, String)
    check(isAsync, Boolean)
    check(data, Object)
    CueTasks.insert({jobName:jobName, isAsync:isAsync, data:data, doing:false, numTries:0})
}


Cue.prototype._doATask = function() {
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

    Meteor.defer(function() {
        job.job(task, function(error) {
            if (error) {
                console.error(' --- ')
                console.error(task.jobName+' errored. Try '+task.numTries)
                console.error(error)
                console.error(task)
                console.error(' --- ')

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




CueTasks = new Mongo.Collection('cuetasks')
