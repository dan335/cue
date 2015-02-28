Job queue for Meteor

Used in Dominus https://dominusgame.net

Works across multiple servers.


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
