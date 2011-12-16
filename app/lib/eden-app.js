var eden_server_path = "http://127.0.0.1:13337/";

var eden_thread;
var eden_frame_svg;
var eden_frame_nodes = [];
var eden_frame_elements = [];

var eden_world_elements = [];

var max_fps = 60;
var lasttime = Date.now();

var eden_man = edenManDefaults();

var debug_starttime = Date.now();

$(document).ready(function(){

	//Initialize svg and world threads
	eden_frame_svg = $('#eden-frame').svg().svg('get');
	eden_thread = setInterval(function(){ edenUpdate();edenDraw();},1.0/max_fps);


	//Attach window listeners
	$(document).keydown(edenKey).keyup(edenKey);
	$(window).blur(edenBlur);
	$(window).resize(edenCenter);

	//Initialize Eden Variables
	edenCenter();

	edenAdd([
		function(svg){
			return svg.circle(eden_man.x,eden_man.y+20,20,{fill:'none',stroke:'black',strokeWidth:2});
		},
		function(svg){
			return svg.line(eden_man.x-8*eden_man.d,eden_man.y+38,eden_man.x-10*eden_man.d,eden_man.y+100,{fill:'none',stroke:'black',strokeWidth:2});
		},
		function(svg){
			return svg.line(eden_man.x+4*eden_man.d,eden_man.y+40,eden_man.x+14*eden_man.d,eden_man.y+100,{fill:'none',stroke:'black',strokeWidth:2});
		},
		function(svg){
			return svg.line(eden_man.x-10*eden_man.d,eden_man.y+100,eden_man.x+14*eden_man.d,eden_man.y+100,{fill:'none',stroke:'black',strokeWidth:2});
		}
	],[
		function(t){
			eden_man.x += eden_man.v_x*t;
			eden_man.y += eden_man.v_y*t;

			if (eden_man.y < 300){
				eden_man.v_y += eden_man.a_y*t;
			} else if (eden_man.y > 300){
				eden_man.y = 300;
			}
		}
	]);

});

//Eden World Initialization
function edenLoad(worldID,callback){
	var world_url = edenURL(["worlds",worldID+".eden"]);
	$.ajax(world_url,{
		cache:true,
		dataType:'text',
		error:function(jqXHR,textStatus,errorThrown){
			alert("Could not connect to server.");
		},success:function(data,textStatus,jqXHR){
			callback(data);
		},type:'get'
	});
}
function edenVerify(worldData,sum){
	return sum == $().crypt({method:"md5",source:worldData});
}
function edenInitializeWorld(worldData){

}

//Eden World Update Loop
function edenUpdate(){

	//update time
	var elapsedtime = Date.now()*1.0 - lasttime; lasttime = Date.now();

	for (var i=0;i<eden_world_elements.length;i++){
		eden_element = eden_world_elements[i];
		for (var j=0;j<eden_element.length;j++){
			(eden_element[j])(elapsedtime);
		}
	}
}

//SVG Draw and Clear Loop
function edenDraw(){
	var svg = eden_frame_svg;
	edenClear();

	var eden_element;
	for (var i=0;i<eden_frame_elements.length;i++){
		eden_element = eden_frame_elements[i];
		for (var j=0;j<eden_element.length;j++){
			eden_frame_nodes.push((eden_element[j])(svg)); //function as parameters
		}
	}
}
function edenClear(){
	for (var i=0;i<eden_frame_nodes.length;i++){
		eden_frame_svg.remove(eden_frame_nodes[i]);
	}
	eden_frame_nodes = [];
}

//Add element to Eden World
function edenAdd(parts,runners){
	var ret = eden_frame_elements.length;
	eden_frame_elements[ret] = parts;
	eden_world_elements[ret] = runners;
	return ret;
}


function edenBlur(e){
	edenKey({releaseAll:true});
}
function edenKey(e){
	if (e.keyCode==18 && e.type == "keydown"){
		eden_man.v_y = -.8;
	}
	if (e.keyCode==37 && e.type == "keydown"){
		eden_man.v_x = -.12;
		eden_man.d = -1;
		eden_man.is_l = true;
		eden_man.is_r = false;
	}
	if (e.releaseAll || e.keyCode==37 && e.type == "keyup" && eden_man.is_l){
		eden_man.v_x = 0;
		eden_man.is_l = false;
	}
	if (e.keyCode==39 && e.type == "keydown"){
		eden_man.v_x = .12;
		eden_man.d = 1;
		eden_man.is_r = true;
		eden_man.is_l = false;
	}
	if (e.releaseAll || e.keyCode==39 && e.type == "keyup" && eden_man.is_r){
		eden_man.v_x = 0;
		eden_man.is_r = false;
	}

}
function edenManDefaults(){
	return {x:20.0,
			y:20.0,
			v_x:0.0,
			v_y:0.0,
			a_x:0.0,
			a_y:.004,
			m_x:0.12,
			m_y:0.3,
			is_l:false,
			is_r:false,
			d:1};
}
function edenCenter(){
	$("#eden-frame").css({left:($(window).width() - 800) / 2,top:($(window).height() - 600)/2});
}
function edenURL(urlarray){
	var ret = [];
	if (eden_server_path.charAt(-1) == "/"){
		ret.push(eden_server_path.substr(0,eden_server_path.length-1));
	} else {
		ret.push(eden_server_path);
	}

	for (var i=0;i<urlarray.length;i++){
		ret.push(urlarray[i].replace(new RegExp('^/|/$','g'),""));
	}
	return ret.join("/");
}