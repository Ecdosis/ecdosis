/**
 * Simple GUI to rebuild index
 * @param target the id of the target eleemnt on the page
 * @param admin "true" or "false" if the user is administrator
 */
function index(target,admin)
{
    this.target = target;
    this.set_html = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
    };
    var self = this;
    this.admin = (admin=="true")?true:false;
    this.draw_slider = function(max, val) 
    {
        var percent=Math.round((val*100)/max);
        jQuery("#szliderbar").css("width",percent+"%");
    }
    var html = '<div id="indexer">';    
    html += '<input type="button" id="rebuild" value="Rebuild index"></input>';
    html += '<div id="progress_bar">';
    html += '<div id="szlider">';
    html += '<div id="szliderbar"></div>';
    html += '<div id="szazalek"></div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    this.set_html( html );
    jQuery("#rebuild").click( function() {
        if ( !self.admin )
        {
            alert("Only an administrator can do that!");
            return;
        }
        else
            console.log("admin="+self.admin);
        var readSoFar=0;
        self.draw_slider( 100, 0 );	
        client = new XMLHttpRequest();
        client.open("GET", "http://"+window.location.hostname+"/search/build");
        //client.open("GET", "http://localhost/search/build");
        client.send();
        // Track the state changes of the request
        client.onreadystatechange = function(){
            // Ready state 3 means that data is ready
            if (client.readyState == 3) {
                // <300 is a successful return
                if(client.status ==200) {
                    var len = client.responseText.length-readSoFar;
                    var num = client.responseText.substr(readSoFar,len);
                    var numbers = num.split("\n");
                    for ( var i=0;i<numbers.length;i++ )
                    { 
                        if ( numbers[i].length > 0 )
                        {
                            var val = parseInt(numbers[i]);
                            self.draw_slider( 100, val );	
                        }
                    }
                    readSoFar = client.responseText.length;
                }
                else if ( client.status >= 300 )
                   console.log("Error:"+client.status); 
            }
            else if ( client.status >= 300 && clientreadyState==4 )
               console.log("Error:"+client.status);
        };
    });
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 * @return a key-value map of the parameters
 */
function get_args( scrName )
{
    var scripts = jQuery("script");
    var params = new Object ();
    scripts.each( function(i) {
        var src = jQuery(this).attr("src");
        if ( src != undefined && src.indexOf(scrName) != -1 )
        {
            var qStr = src.replace(/^[^\?]+\??/,'');
            if ( qStr )
            {
                var pairs = qStr.split(/[;&]/);
                for ( var i = 0; i < pairs.length; i++ )
                {
                    var keyVal = pairs[i].split('=');
                    if ( ! keyVal || keyVal.length != 2 )
                        continue;
                    var key = unescape( keyVal[0] );
                    var val = unescape( keyVal[1] );
                    val = val.replace(/\+/g, ' ');
                    params[key] = val;
                }
            }
            return params;
        }
    });
    return params;
}
/**
 * Load the rebuild index dialog with two arguments
 */
jQuery(document).ready( function() { 
    var params = get_args('index');
    new index(params['target'],params['admin']);
}); 
