if (Meteor.isServer) {
    Meteor.publish('cueTasks', function() {
        return CueTasks.find({}, {sort:{createdAt:-1}, limit:50})
    })

    Meteor.publish('cueStats', function() {
        return CueStats.find()
    })
}
