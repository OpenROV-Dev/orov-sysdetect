#!/usr/bin/env node

var Promise = require( "bluebird" );
var fs     	= Promise.promisifyAll( require("fs") );
var path	= require('path');

var platConfDir = path.resolve( __dirname + "/../config/" );

var platformName 	= "";

var board			= {};
var board_conf		= {};

var LoadBoardInfo	= {};
var BoardInstaller	= {};

fs.readFileAsync( platConfDir + "/platform.conf", "utf8" )
.then( function( data )
{
	// Parse platform info from configuration file
	var platInfo 	= JSON.parse( data );
	platformName 	= platInfo.platform;
	
	if( platformName == "" )
	{
		throw "No platform specified";
	}
	
	return Promise.try( function()
	{
		// Fetch board info loading function (Will use specific mechanism for this platform to load board info, like reading EEPROM storage)
		LoadBoardInfo 	= require( path.resolve( "/opt/openrov/cockpit/src/system-plugins/platform-manager/platforms/", platformName, "board.js" ) ).LoadInfo;
	} )
	.catch( function( err )
	{
		throw Error( "Failed to load board.js for specified platform: " + platformName );
	} );
} )
.then( function()
{
	return LoadBoardInfo( board );
} )
.then( function()
{
	// Attempt to load existing board info
	return fs.readFileAsync( platConfDir + "/board.conf" )
			.then( JSON.parse )
			.then( function( info )
			{
				board_conf.productId 	= info.productId;
				board_conf.rev			= info.rev;
			})
			.catch( function( err )
			{
				// Non-existent or incomplete board info, so just act as if we had none
				board_conf.productId 	= "";
				board_conf.rev			= "";
			} );
})
.then( function()
{
	if( board.info.productId == "" )
	{
		// No supported board detected. Nothing more to do. Cockpit will end up loading without a board interface.
		console.log( "No physical board detected. Exiting." );
		process.exit( 0 );
	}
	else if( board_conf.productId == "" )
	{
		console.log( "Installing board for first time." );
		
		// Board present, but not installed. Fetch install module
		BoardInstaller = require( path.resolve( "/opt/openrov/cockpit/src/system-plugins/platform-manager/platforms/", platformName, "boards/", board.info.productId, "install/Installer.js" ) );
		
		// Install board files
		BoardInstaller.Install();
		
		return fs.writeFileAsync( platConfDir + "/board.conf", JSON.stringify( board.info ) );
	}
	else
	{
		if( board_conf.productId == board.info.productId && board_conf.rev == board.info.rev )
		{
			// Board already installed
			console.log( "Board already installed." );
			process.exit( 0 );
		}
		else
		{
			console.log( "Different board type or revision is installed" );
			
			// Different board type or revision is installed. Fetch install module
			BoardInstaller = require( path.resolve( "/opt/openrov/cockpit/src/system-plugins/platform-manager/platforms/", platformName, "boards/", board.info.productId, "install/Installer.js" ) );
		
			// Uninstall old board files
			BoardInstaller.Uninstall();
			
			// Install new board files
			BoardInstaller.Install();
					
			return fs.writeFileAsync( platConfDir + "/board.conf", JSON.stringify( board.info ) );
		}
	}
} )
.catch( function( err )
{
	console.log( "Error: " + err.message );
})
.then( function()
{
	console.log( "Exiting." );
	process.exit( 0 );
})
