require( 'dotenv' ).config();
const _ = require( 'lodash' );
const Inquirer = require( 'inquirer' );
const Mongoose = require( 'mongoose' );
const fs = require( 'fs' );
const request = require( 'request' );
const moment = require( 'moment' );
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
 * Get all records
 */
tumblrDB.find().then( ( records ) => {
    let downloadTasks = [];

    records.forEach( ( record ) => {
        downloadTasks.push( downloadRecord( record ) );
    } );

    Promise.all( downloadTasks ).then( () => {
        console.log( 'Downloads complete' );
        process.exit();
    } ).catch( ( err ) => {
        throw new Error( err );
    } );
} );

function downloadRecord ( record ) {
    let filename = moment( record.postDate.replace( / GMT/, '' ), 'YYYY-MM-DD HH:mm:ss ' ).unix();
    let ext = _.get( record, 'photos[0].original_size.url' ).slice( -4 );

    return new Promise( ( resolve, reject ) => {
        try {
            if ( ext ) {
                let file = fs.createWriteStream( 'images/' + filename + ext );

                request( _.get( record, 'photos[0].original_size.url' ) ).pipe( file ).on( 'close', () => {
                    return resolve();
                } );
            } else {
                return resolve();
            }
        } catch ( err ) {
            return resolve();
        }
    } );
}
