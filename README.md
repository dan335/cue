Simple queue for Meteor

Used in Dominus https://dominusgame.net

Example
---

    cue = new Cue(5)
    cue.start()

    cue.addJob('job1', false, function(task, done) {
        console.log('doing '+task.jobName+' '+task.data.blah)
        Meteor.setTimeout(function() {
            done()
        }, 2000)
    })

    cue.addJob('job2', false, function(task, done) {
        console.log('doing '+task.jobName+' '+task.data.blah)
        Meteor.setTimeout(function() {
            done()
        }, 2000)
    })

    cue.addTask('job1', false, {blah:1})
    cue.addTask('job1', false, {blah:2})
    cue.addTask('job1', false, {blah:3})


    cue.addTask('job2', true, {blah:1})
    cue.addTask('job2', true, {blah:2})
    cue.addTask('job2', true, {blah:3})
