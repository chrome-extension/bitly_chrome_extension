// 
//  bEvt.hovercard.js
//  bitly_chrome_extension
//  
//  Created by gregory tomlinson on 2011-04-12.
//  Copyright 2011 the public domain. All rights reserved.
//

/*

    Hover Card
    
        Visual display on DOM pages
            -- Interaction and storage controls
            
            
    Requires:
        SQLLite / bitDB
        bitlyAPI
*/ 
bExt.hovercard={
    '__data' : {},
    'blacklist' : function() {
        var hv = bExt.info.get("hovercard") || {};
        if(!hv.blacklist) {
            hv.blacklist = ["bit.ly", "j.mp"];
            bExt.info.set("hovercard", hv);
        }
        return hv.blacklist;
        
    },
    
    'store_md5domains' : function( jo ) {       
        var bit_domains = jo.reverse(), 
            params = { 'domains' :  bit_domains, 'timestamp' : (new Date()).getTime() };
        bExt.db.save( "domains_list", params, function() {
            console.log("storing domains to sql", bit_domains.length);
        });       
    },
    
    add_prohibited : function( prohibited_host ) {
        
        var prohibited=bExt.hovercard.get_prohibited();
        
        if(prohibited.indexOf( prohibited_host ) > -1 ) { return; }
        prohibited.push(prohibited_host);
        bExt.info.set("no_expand_domains", prohibited);
        
        return true;
    },
    
    get_prohibited : function() {
        var prohibited = bExt.info.get("no_expand_domains");
        if(!prohibited) {
            prohibited = ["bit.ly", "j.mp", "bitly.com"];
            bExt.info.set("no_expand_domains", prohibited);
        }
        return prohibited;
    },
    
    
    'get_domains' : function( callback ) {
        // todo, setup expire
        var md5_domains_list=[]
        bExt.db.find("domains_list", function(jo) {
            var then = (new Date()).getTime() - (24*60*60*1000)*5;
            if(jo && jo.timestamp > then && jo.domains.length > 10) {

                bExt.hovercard.__data['bitly_domains'] =  jo.domains || jo;
            } else {
                if( bExt.api.is_authenticated() ) {
                    bExt.events.trigger("bitly_domains", {
                        'callback' : function(jo) {
                            // todo add save
                            console.log("remote call to bit domains", jo);
                            bExt.hovercard.store_md5domains(jo.domains || jo);
                            callback( jo.domains || jo );
                        }
                    });
                }
            }
            callback( bExt.hovercard.__data['bitly_domains'] );

        });
    },
        
    'md5domains' : function( url_list, callback ) {
        if(bExt.hovercard.__data['bitly_domains']) {
            bExt.hovercard._md5domains( url_list, callback );
            return;
        }
        bExt.hovercard.get_domains(function(data) {
            bExt.hovercard._md5domains( url_list, callback ); 
        });
    },
    '_md5domains' : function( url_list, callback ) {
        
        if(!url_list){ callback([]); }
        
        var domain, possible, i=0, j=0, final_results=[],
            l=bExt.hovercard.__data['bitly_domains'],
            possible_domains = bExt.hovercard._md5_hosts( url_list ),
            total_possible = possible_domains.length;
            
        if(possible_domains <= 0 ) { return; }
        if(l.length > 1 ) {
            // JS Definitive Guide page 90, 6.10 labels
            // Avoids having to recaluate .length on domains_list, which is ~3100 items
            // label allows inner loop to break outer loop
            outerloop:
                for( ; domain = l[i]; i++) {
                    innerloop:
                        for(j=0; possible=possible_domains[j]; j++) {
                            if(possible.md5 === domain ) {
                                final_results.push( possible.short_url ); // positive match
                                if(final_results.length >= total_possible) {  break outerloop; }
                            }
                        }
                }
        } else { final_results = url_list; }
        
        callback(final_results);
    },
    
    '_md5_hosts' : function( url_list ) {
        var host_name, url, md5_domain, i=0, final_list = [];
        for( ; url=url_list[i]; i++) {
            host_name = bExt.match_host( url );

            if(host_name) { 
                md5_domain = hex_md5( host_name );
            } else  {
                md5_domain = null;
                continue;
            }
            final_list.push({ 'md5' : md5_domain, 'short_url' : url })
        }

        return final_list;
    },
    
    'allow' : function() {
        var hv = bExt.info.get("hovercard") || {};
        if(hv.show_card !== false) {
           hv.show_card=true; 
           bExt.info.set("hovercard", hv);
        }
        
        return hv && hv.show_card;
    },
    'toggle' : function( show_bool  ) {
        var hv = bExt.info.get("hovercard") || {};
        hv.show_card=show_bool;
        bExt.info.set("hovercard", hv);
    }
}