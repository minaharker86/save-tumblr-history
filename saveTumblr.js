const config = require( 'dotenv' ).config();
const _ = require( 'lodash' );
const Inquirer = require( 'inquirer' );
const Tumblr = require( 'tumblr.js' );

/**
 * Connect to Tumblr
 */
const tumblrClient = Tumblr.createClient( {
    'consumer_key': process.env.TUMBLR_CONSUMER_KEY,
    'consumer_secret': process.env.TUMBLR_CONSUMER_SECRET,
    'token': process.env.TUMBLR_TOKEN,
    'token_secret': process.env.TUMBLR_SECRET
} );
let inquireQuestions = [];

getBlogs().then( ( blogs ) => {
    /**
     * Which blog question
     */
    let blogQuestion = {
        'type': 'list',
        'name': 'blogName',
        'message': 'Which blog do you want to backup?',
        'choices': _.map( blogs, 'name' )
    };

    inquireQuestions.push( blogQuestion );

    /**
     * How to backup question
     */
    let backupTypeQuestion = {
        'type': 'list',
        'name': 'backupType',
        'message': 'How would you like to save the images?',
        'choices': [
            'images/',
            'images/YYYY-MM-DD',
            'images/YYYY/MM/DD'
        ]
    };

    inquireQuestions.push( backupTypeQuestion );

    Inquirer.prompt( inquireQuestions ).then( ( answers ) => {
        tumblrClient.blogPosts( answers.blogName, {'type': 'photo'}, ( err, resp ) => {
            let totalPosts = resp.total_posts;

            /**
             * Tumblr only allows a max of 20 posts so if they hav eless than that
             * just save and exit.
             */
            if ( totalPosts > 20 ) {
                /**
                 * Save the first response
                 */
                savePosts( resp.posts );
            } else {
                savePosts( resp.posts );
            }
        } );
    } );
} );

/**
 * Get a list of their blogs
 */
function getBlogs () {
    return new Promise( ( resolve, reject ) => {
        tumblrClient.userInfo( ( err, data ) => {
            if ( err ) {
                return reject( err );
            }

            return resolve( data.user.blogs );
        } );
    } );
}
