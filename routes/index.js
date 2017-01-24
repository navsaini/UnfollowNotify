var express = require('express');
var router = express.Router();

var Promise = require('bluebird');
var Twitter = require('twitter');
var cron = require('cron');
var _ = require('lodash');

var oldFollowers = [];
var newFollowers = [];

var client = new Twitter({
	consumer_key: 'LBYuxSAGxVpSxm4rRLdAU55er',
	consumer_secret: 'B9hJVRwjYEdna8FVBtSI1FvAZlHE80xHEYHA29xnSlzOUryMNc',
	access_token_key: '3290333605-vK3tEpPO2vipE5I4RBIpKo9nr2pulUdK7tLy3YU',
	access_token_secret: 'IVDT5nFgIFgdN05oCMfiw0rPjUwfQBVIkmEQO3z2wN4Wd'
});


getFollowers('navendusaini')
.then(result => {
	console.log(result["ids"].length);
	return result;
})
.then(getNames)
.then(result => {
	console.log(result);
	oldFollowers = result
})	
.catch(handleError);

// cron pattern for every midnight: 0 0 * * * 
new cron.CronJob('* * * * *', () => {
	console.log("running cron job...");

	getFollowers('navendusaini')
	.then(getNames)
	.then(result => {
		oldFollowers = newFollowers;
		newFollowers = result;
	})
	.then(computeDifference)
	.then(checkEmptyArray)
	.then(boolVal => {
		console.log(bool);
	})	
	.catch(handleError);
}, null, true, 'America/Los_Angeles');

function computeDifference() {
	return new Promise((resolve, reject) => {
		resolve(oldFollowers.filter(x => newFollowers.indexOf(x) < 0));
	});
}

// Used to check if A - B is empty
function checkEmptyArray(array) {
	return new Promise((resolve, reject) => {
		resolve(array.length == 0);
	});
}

// incorporate SendGrid API
function sendEmail(empty) {
	return new Promise((resolve, reject) => {
		if (empty) resolve(false);



	});
}

// Get follower ids from Twitter
function getFollowers(screenName) {
	return new Promise((resolve, reject) => {
		client.get('followers/ids', {screen_name: screenName, stringify_ids : true})
		.then(followers => {
			resolve(followers)
		})
		.catch(err => reject(err));
	});
}	

// Get follower names from ids
function getNames(ids) {
	var commas = constructString(ids["ids"]);

	return new Promise((resolve, reject) => {
		client.post('users/lookup', {user_id: commas})
		.then(followers => resolve(followers.map(follower => follower["name"])))
		.catch(err => reject(err));
	});
}

// Convert array to string to put in request
function constructString(ids) {
	var commas = "";

	_.forEach(ids, each => {
		commas += each;
		commas += ",";
	});

	return commas;
}

// Generic error handler
function handleError(error) {
	console.log(error);
	throw error;
}

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});


module.exports = router;
