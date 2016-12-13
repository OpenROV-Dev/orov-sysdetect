#!/usr/bin/env node

var Promise 		= require( "bluebird" );
var fs     			= Promise.promisifyAll( require("fs") );
var path			= require('path');
var execFileAsync 	= require('child-process-promise').execFile;

var platConfDir = path.resolve( __dirname + "/../config/" );

var platformName 	= "";

var board			= { targetBoard: {} };
var board_conf		= {};

var LoadBoardInfo	= {};
var Installer		= require( "/opt/openrov/cockpit/src/lib/Installer.js" );

fs.readFileAsync( platConfDir + "/platform.conf" )
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
				board_conf.boardId		= info.boardId;
			})
			.catch( function( err )
			{
				// Non-existent or incomplete board info, so just act as if we had none
				board_conf.productId 	= "";
				board_conf.boardId		= "";
			} );
})
.then( function()
{
	if( board.info.productId == "" )
	{
		// No supported board detected. Nothing more to do. Cockpit will end up loading without a board interface.
		console.log( "No physical board detected." );
	}
	else if( board_conf.productId == "" )
	{
		console.log( "Installing board for first time." );
					
		var installDir = path.join( "/opt/openrov/cockpit/src/system-plugins/platform-manager/platforms", platformName, "boards", board.info.boardId, "install" );
		
		// Install board files
		return Installer.Install( installDir )
				.then( function()
				{
					return fs.writeFileAsync( platConfDir + "/board.conf", JSON.stringify( board.info ) )
							.then( function()
							{
								if( process.env.USE_MOCK != "true" )
								{
									console.log( "Rebooting!" );

									// Reboot
									return execFileAsync( "/sbin/reboot" )
											.catch( function( err )
											{
												console.log( "Error rebooting: " + err.message );
											});
								}
								else
								{
									console.log( "Skipping reboot. Mock mode detected." );
								}
							});
				})
				.catch( function(err)
				{
					console.log( err );
				});
	}
	else
	{
		if( board_conf.productId == board.info.productId && board_conf.boardId == board.info.boardId )
		{
			// Board already installed
			console.log( "Board already installed." );
		}
		else
		{
			console.log( "Different product type or board type is installed" );
			
			var installDir = path.join( "/opt/openrov/cockpit/src/system-plugins/platform-manager/platforms", platformName, "boards", board.info.boardId, "install" );

			// Uninstall old board files
			return Installer.Uninstall( installDir )
			.then( function()
			{
				return Installer.Install( installDir );
			})
			.then( function()
			{
				console.log( "Writing board configuration to /opt/openrov/system/config/board.conf" );

				return fs.writeFileAsync( platConfDir + "/board.conf", JSON.stringify( board.info ) )
						.then( function()
						{	
							if( process.env.USE_MOCK != "true" )
							{
								console.log( "Rebooting!" );

								// Reboot
								return execFileAsync( "/sbin/reboot" )
										.catch( function( err )
										{
											console.log( "Error rebooting: " + err.message );
										});
							}
							else
							{
								console.log( "Skipping reboot. Mock mode detected." );
							}
						});
			});
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
