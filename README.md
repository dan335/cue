Job queue for Meteor

Used in Dominus https://dominusgame.net https://github.com/dan335/dominus


Example
---
    Cue.start()

    Cue.addJob('funStuff', {retryOnError:false, maxMs:1000}, function(task, done) {
        console.log('doing '+task.jobName+' with '+task.data.friendName)
        done()
    })

    Cue.addJob('stupidStuff', {retryOnError:false, maxMs:1000}, function(task, done) {
        console.log('doing '+task.jobName+' with '+task.data.friendName)
        done('found an error while doing stupid stuff')
    })

    Cue.addTask('funStuff', {isAsync:true, unique:false}, {friendName:'sara'})


Templates
---
    {{> cueStats}} - stats on how long tasks take
    {{> cueTasks}} - list of tasks in queue and buttons to manage them
    {{> cueJobs}} - list of jobs and buttons to run them


API
---
    // how many tasks to process at once
    Cue.maxTasksAtOnce = 10

    // how many times to retry tasks
    Cue.maxTaskTries = 3

    // cancel any task that isn't finished in this time
    Cue.maxTime = 1000*60*30

    // drop all tasks
    Cue.dropTasks()

    // call once to start processing tasks
    Cue.start()

    Cue.dropTask(taskId)
    Cue.dropInProgressTasks()
    Cue.restartInProgressTasks()
    Cue.stop()
    Cue.pause()
    Cue.unpause()

    // define a job
    // options = retryOnError, maxMs, maxAtOnce
    // retryOnError - retry job if it retruns an error
    // maxMs - remove job if it runs for longer than this
    // maxAtOnce - limit number of async tasks of this job running at once
    // Function is called with two variables, 'task' and 'done'. Task is the task object.  Call done() at the end of the function.  Call done('error message') if job errors.
    Cue.addJob(name, options, function)

    // add a task to the queue
    // options = isAsync, unique, delay, delayUntil
    // isAsync - true to run multiple tasks of the same type at once.  false to only process one of each type at a time.
    // unique - only allow one task with the same jobname and data allowed in the queue.
    // delay - delay task for this number of ms.
    // delayUntil - Takes a javascript date. Don't start task until this time.
    Cue.addTask(jobName, options, data)
    Cue.addTask('hardwork', {isAsync:true, unique:true}, {blah:true});

    Cue.retryTask(taskId)

    // stats are reset daily, shouldn't need to call this
    Cue.resetStats()

TODO
---
* Handling errors needs work.
