require( 'dotenv' ).config();
const _ = require( 'lodash' );
const Inquirer = require( 'inquirer' );
const Tumblr = require( 'tumblr.js' );
const Mongoose = require( 'mongoose' );

const Schema = Mongoose.Schema;

// Connect to Mongo
Mongoose.connect( 'mongodb://localhost/tumblr' );
const tumblrSchema = new Schema( {
    'tumblrID': Number,
    'postUrl': String,
    'postDate': String,
    'caption': String,
    'photos': Schema.Types.Mixed,
    'createdAt': Date
} );

let tumblrDB = Mongoose.model( 'posts', tumblrSchema );

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
    // let backupTypeQuestion = {
    //     'type': 'list',
    //     'name': 'backupType',
    //     'message': 'How would you like to save the images?',
    //     'choices': [
    //         'images/',
    //         'images/YYYY-MM-DD',
    //         'images/YYYY/MM/DD'
    //     ]
    // };

    // inquireQuestions.push( backupTypeQuestion );

    Inquirer.prompt( inquireQuestions ).then( ( answers ) => {
        /**
         * Initial request 
         */
        tumblrClient.blogPosts( answers.blogName, {'type': 'photo'}, ( err, resp ) => {
            if ( err ) {
                throw new Error( err );
            }

            let totalPosts = resp.total_posts;

            /**
             * Tumblr only allows a max of 20 posts so if they have less than that
             * just save and exit.
             */
            if ( totalPosts > 20 ) {
                /**
                 * Save the first response
                 */
                let requestArray = [];

                for ( let i = 0; i < totalPosts; i += 20 ) {
                    requestArray.push( getPosts( answers.blogName, i ) );
                }

                Promise.all( requestArray ).then( ( responses ) => {
                    let savePromises = [];

                    responses.forEach( ( posts ) => {
                        savePromises.push( savePosts( posts ) );
                    } );

                    Promise.all( savePromises ).then( ( values ) => {
                        console.log( 'All done' );
                        process.exit();
                    } );
                } );
            } else {
                savePosts( resp.posts );
            }
        } );
    } );
} );

function getPosts ( blogName, offset = 0 ) {
    return new Promise( ( resolve, reject ) => {
        tumblrClient.blogPosts( blogName, {'type': 'photo', 'offset': offset}, ( err, resp ) => {
            if ( err ) {
                return reject( err );
            }

            return resolve( resp.posts );
        } );
    } );
}

/**
 * Save the post data locally
 */
function savePosts ( posts ) {
    return new Promise( ( resolve, reject ) => {
        if ( !Array.isArray( posts ) ) {
            return reject( new Error( 'Array not passed' ) );
        }

        let insertPromises = [];

        posts.forEach( ( post ) => {
            let newRecord = {
                'tumblrID': post.id,
                'postUrl': post.post_url,
                'postDate': post.date,
                'caption': post.caption,
                'photos': post.photos,
                'createdAt': new Date()
            };

            insertPromises.push( tumblrDB.create( newRecord ) );
        } );

        Promise.all( insertPromises ).then( ( values ) => {
            return resolve( );
        } );
    } );
}

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
