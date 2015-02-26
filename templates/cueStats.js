if (Meteor.isClient) {

    Template.cueStats.helpers({
        stats: function() {
            return CueStats.find({}, {sort:{jobName:1}})
        }
    })


    Template.cueStat.helpers({
        lastRunCalendar: function() {
            return moment(new Date(this.lastRunDate)).calendar()
        },

        average: function() {
            return this.msToday / this.timesRunToday
        }
    })


    Template.cueStats.created = function() {
        this.autorun(function() {
            Meteor.subscribe('cueStats')
        })
    }

}
