const express = require('express');
const router = express.Router();

const Promise = require('bluebird');
const Twitter = require('twitter');
const cron = require('cron');
const _ = require('lodash');
const helper = require('sendgrid').mail;
const sg = require('sendgrid')(process.env.SENDGRID_API_KEY);

var oldFollowers = [];
var newFollowers = [];

const client = new Twitter({
	consumer_key: process.env.CONSUMER_KEY,
	consumer_secret: process.env.CONSUMER_SECRET,
	access_token_key: process.env.ACCESS_TOKEN_KEY,
	access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

// cron pattern for every midnight: 0 0 * * *
// cron pattern for every minute: * * * * *
new cron.CronJob('* * * * *', () => {
	console.log("running cron job...");

	getFollowers('navendusaini')
	.then(getNames)
	.then(result => {
		oldFollowers = newFollowers;
		newFollowers = result;
		console.log(newFollowers);
	})
	.then(computeDifference)
	.then(lostFollowers => {
		sendEmail(lostFollowers);
	})
	.catch(handleError);
}, null, true, 'America/Los_Angeles');

function computeDifference() {
	return new Promise((resolve, reject) => {
		resolve(oldFollowers.filter(x => newFollowers.indexOf(x) < 0));
	});
}

// incorporate SendGrid API
function sendEmail(listOfUnfollowers) {
	return new Promise((resolve, reject) => {
		if (listOfUnfollowers.length === 0) resolve(false);
		else {
			try {
				// assemble the email
				const fromEmail = new helper.Email('unfollow_notify@gmail.com');
				const toEmail = new helper.Email(process.env.TO_EMAIL);
				const subject = 'You lost followers on Twitter :(';
				const content = new helper.Content('text/plain', 'Users with the usernames: ' +
					listOfUnfollowers + ' have unfollowed you on Twitter.');

				const mail = new helper.Mail(fromEmail, subject, toEmail, content);

				// assemble the request
				const request = sg.emptyRequest({
				  method: 'POST',
				  path: '/v3/mail/send',
				  body: mail.toJSON()
				});

				// make the API call
				sg.API(request, function (error, response) {
				  if (error) {
				    console.log('Error response received');
				  }
				  console.log(response.statusCode);
				  console.log(response.body);
				  console.log(response.headers);
					resolve(true)
				});

			} catch(error) {
				resolve(false);
			}
		}
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
