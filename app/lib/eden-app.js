var eden_server_path = "http://127.0.0.1/app/";

var eden_thread;
var eden_frame_svg;
var eden_frame_nodes = [];
var eden_frame_elements = [];
var max_fps = 60;
var eden_dim = [800,600];
var lasttime = Date.now();

var eden_world_elements = [];
var eden_surfaces = [];

var eden_start;
var eden_main;
var eden_cam;

var eden_man = edenManDefaults();

var debug_starttime = Date.now();

$(document).ready(function(){

	//Initialize svg
	eden_frame_svg = $('#eden-frame').svg().svg('get');


	//Attach window listeners
	$(document).keydown(edenKey).keyup(edenKey);
	$(window).blur(edenBlur);
	$(window).resize(edenCenter);

	//Initialize Eden Variables
	edenCenter();

	edenLoad(100,function(data){
		//muhahahaha
		try {
			data = jQuery.parseJSON(data);
		} catch (e){
			notify("Exception in JSON World File: " + e.description);
		}
		edenResetWorld();
		edenProcessWorld(data);
		eden_thread = setInterval(function(){ edenUpdate();edenDraw();},1.0/max_fps);
	});

if (false){
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
}

});

//Eden World Initialization
function edenLoad(worldID,callback){
	var world_url = edenURL(["worlds",worldID+".eden"]);
	$.ajax(world_url,{
		cache:true,
		dataType:'text',
		error:function(jqXHR,textStatus,errorThrown){
			notify("Could not connect to server.");
		},success:function(data,textStatus,jqXHR){
			callback(data);
		},type:'get'
	});
}
function edenResetWorld(){
	eden_cam = eden_main = {};
	eden_surfaces = eden_world_elements = [];
}
function edenProcessWorld(data){
	if (data.eden === true){
		edenInitializeWorld(data.worldData);
	} else {
		notify("Malformed world file.");
	}
}
function edenInitializeWorld(worldData){
	//Initialize Camera and Character
	eden_start = {
		x:worldData.start[0],
		y:worldData.start[1],
	};
	//define it twice just in case
	eden_cam = {
		x:worldData.start[0],
		y:worldData.start[1],
	};
	eden_main = {
		x:worldData.start[0],
		y:worldData.start[1],
		v_x:0.0,
		v_y:0.0,
		a_x:0.0,
		a_y:0.004,
		is_l:false,
		is_r:false,
		d:1
	}
	eden_surfaces = eden_surfaces.concat(worldData.surfaces);
	var frame_element;
	for (var i=0;i<worldData.elements.length;i++){
		frame_element = [];
		for (var j=0;j<worldData.elements[i].length;j++){
			frame_element.push(edenGetFrameElementDrawer(worldData.elements[i][j]));
		}
		if (frame_element.length != 0) eden_frame_elements.push(frame_element);
		else notify("Warning: Frame element of 0 in world file encountered.");
	}
}
function edenGetFrameElementDrawer(element){
	if (element[0] == "line"){
		return (function(element){
			return function(svg){
				return svg.line(element[2] + element[1]*(eden_cam.x - eden_start.x),
				                element[3] + element[1]*(eden_cam.y - eden_start.y),
				                element[4] + element[1]*(eden_cam.x - eden_start.x),
				                element[5] + element[1]*(eden_cam.y - eden_start.y),
				                element[6]);
			};
		})(element);
	} else if (element[0] == "circle"){
		return (function (element){
			return function(svg){
				return svg.circle(element[2] + element[1]*(eden_cam.x - eden_start.x),
				                element[3] + element[1]*(eden_cam.y - eden_start.y),
				                element[4],element[5]);

			};
		})(element);
	} else if (element[0] == "ellipse"){
		return (function (element){
			return function(svg){
				return svg.ellipse(element[2] + element[1]*(eden_cam.x - eden_start.x),
				                element[3] + element[1]*(eden_cam.y - eden_start.y),
				                element[4],element[5],element[6]);

			};
		})(element);
	} else if (element[0] == "rect"){
		return (function (element){
			return function(svg){
				return svg.rect(element[2] + element[1]*(eden_cam.x - eden_start.x),
				                element[3] + element[1]*(eden_cam.y - eden_start.y),
				                element[4],element[5], //width and height
				                element[6],element[7], //rounded x and rounded y
				                element[8] //settings
				                );

			};
		})(element);
	} else if (element[0] == "polyline"){
		return (function (element){
			return function(svg){
				var correctedpoints = adjustPolypoint(element[2],element[1]); //untested
				return svg.polyline(correctedpoints,element[3]);
			};
		})(element);
	} else if (element[0] == "polygon"){
		return (function (element){
			return function(svg){
				var correctedpoints = adjustPolypoint(element[2],element[1]); //untested
				return svg.polygon(correctedpoints,element[3]);
			};
		})(element);
	} else {
		notify("Unrecognized element in world file: "+element[0].toString()+".");
	}
}
function adjustPolypoint(points,d){
	var ret = [];
	for (var i=0;i<points.length;i++){
		ret.push([points[i][0] + d*(eden_cam.x - eden_start.x),points[i][1] + d*(eden_cam.y - eden_start_y)]);
	}
	return ret;
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
	if (eden_server_path.charAt(eden_server_path.length-1) == "/"){
		ret.push(eden_server_path.substr(0,eden_server_path.length-1));
	} else {
		ret.push(eden_server_path);
	}

	for (var i=0;i<urlarray.length;i++){
		ret.push(urlarray[i].replace(new RegExp('^/|/$','g'),""));
	}
	return ret.join("/");
}
function notify(msg){
	if (window.console) console.log(msg);
}