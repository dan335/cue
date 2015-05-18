CueTasks = new Mongo.Collection('cuetasks')
CueStats = new Mongo.Collection('cuestats')
CueData = new Mongo.Collection('cuedata')

if (Meteor.isServer) {
    Meteor.startup(function () {
        CueStats._ensureIndex({jobName:1, createdAt:1})
        CueTasks._ensureIndex({jobName:1, doing:1, createdAt:1, delayUntil:1})
        CueData._ensureIndex({name:1})
    })
}
