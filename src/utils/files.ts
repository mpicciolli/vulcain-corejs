import * as Path from 'path';
import * as fs from 'fs';
import { System } from './../configurations/globals/system';

export class Files
{
    static traverse( dir:string, callback?:( n, v )=>void, filter?:(fileName)=>boolean )
    {
        if(!filter)
            filter = (fn) => Path.extname( fn ) === ".js";

        if( fs.existsSync( dir ) )
        {
             fs.readdirSync( dir ).forEach( fn =>
             {
                 if( filter(fn) )
                 {
                     try
                     {
                         var c = require( Path.join( dir, fn ) );
                         if( !c || !callback) return;
                         for( var ctl in c )
                         {
                             callback( ctl, c[ctl] );
                         }
                     }
                     catch(err)
                     {
                         System.log.error(null, err, `ERROR when trying to load component ${fn}`);
                         process.exit(1);
                     }
                 }
                 else
                 {
                     let fullPath = Path.join( dir, fn );
                     if( fs.statSync( fullPath ).isDirectory() )
                     {
                         Files.traverse( Path.join( dir, fn ), callback );
                     }
                 }
             });
        }
    }
}