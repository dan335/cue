if (Meteor.isServer) {
    Meteor.publish('cueTasks', function() {
        return CueTasks.find({}, {sort:{createdAt:1}, limit:60})
    })

    Meteor.publish('cueStats', function() {
        return CueStats.find()
    })

    Meteor.publish('cueStatus', function() {
        return CueData.find({name:'stopped'})
    })
}
