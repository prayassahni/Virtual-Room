var vid = document.getElementById("video-stream"); // Video to be streamed
var vidHeight = vid.getAttribute("height");
var vidWidth = vid.getAttribute("width");
var vidFile = document.getElementById("video-file");
var broadcastURL = document.getElementById("broadcast-url");
var baseURL = "http://127.0.0.1:3000/room/"; // Will be changed accordingly
var peerID = 'xxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);}); // Generating UUID(taking only the first section of the string) according to the RFC4122 version 4(https://www.ietf.org/rfc/rfc4122.txt)
var vidToWindowRatio;
var aspectRatio;
var videoLoaded;
var serverConfig = {iceServers: [{ url: 'stun:stun.l.google.com:19302' }]};
var peersInRoom = [];
var peerNum = document.getElementById("peer-num").innerText;
var senderID;
var mimeCodec;
var outBuffer = new Array(); 
var sourceBuffer;
var chunkSize = 16*1024; // 16kb
var signalServer;
var peerConnection = [];


if (window.location.href.length - peerID.length == baseURL.length){
	console.log(senderID);
	senderID = window.location.replace(baseURL);
}else{
	history.replaceState('', '', baseURL + peerID);
	console.log("peer is sender");
	senderID = peerID;
}

generateURL();
preInititiation();

// if there is a new user he will be directed to base url as he makes a virtual room, and if an new peer joins existing room we assign sender id according to the window location
var currentPeer;

window.onload = function(){
	console.log("window loaded");
// 	history.replaceState('', '', baseURL + peerID);
// 	generateURL();
// 	preInititiation();
};

signalServer.onopen = function(){
	// on connecting to signal server add peer to room/add room 
	// handling the case of host user to differentiate with normal peers
	if (peerID == senderID){
		signalServer.send(JSON.stringify({"addRoom": true, "roomID": senderID}));
	}else{
		signalServer.send(JSON.stringify({"verifyRoom": "not verified", "roomID": senderID})); // message sent only if peer comes by direct link
	}
	signalServer.send(JSON.stringify({"peerID": peerID, "addPeer": true, "roomID": senderID}));
};

// Check if all required API's are available in the peer's browser

window.MediaSource = window.MediaSource || window.WebKitMediaSource;
if (!!!window.MediaSource) {
  alert('MediaSource API is not available :_(');
  Materialize.toast("OOPS! You may not be able to access all the features of the room");
}

window.RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
if (!!!window.RTCPeerConnection || !!!window.RTCIceCandidate || !!!window.RTCSessionDescription) {
  alert('WebRTC API is not available :_(');
  Materialize.toast("OOPS! You may not be able to access all the features of the room");
}

signalServer.onmessage = function (message){
	console.log("message received");
	handleMessage(message);
};


// Used for messages apart from peer connections, for peer connection refer to gotMessageFromServer()
function handleMessage(message){
	console.log(message.data);
	var decodedMessage = new TextDecoder().decode(new Uint8Array(message.data));
	console.log(decodedMessage);
	parsedMessage = JSON.parse(decodedMessage);

	if (parsedMessage.signalConnection){
		gotMessageFromServer(parsedMessage);
	};

	if (parsedMessage.roomExists=="false"){
		Materialize.toast("OOPS! We couldn't find a room with this url", 2000, '',function(){
		window.location.href = "http://127.0.0.1:3000/src/html/room.html";
	});
	};

	if (parsedMessage.message){
		Materialize.toast(parsedMessage.message, 2000);
	};

	// if (parsedMessage.newPeer){
	// 	server_id = parseInt(parsedMessage.server_id)
	// 	peersInRoom[server_id] = {"connection": ""}
	// }

}


// Filling placeholders after the video has been loaded
vid.addEventListener("loadedmetadata", function(e){
	videoLoaded = true;
	aspectRatio = vid.videoWidth/vid.videoHeight;
	vidToWindowRatio = (vid.videoHeight/screen.height).toFixed(3);
	var newHeight = (window.outerHeight*vidToWindowRatio);
	var newWidth = newHeight*aspectRatio;
	widthChange(newWidth); // Set the video frame size as per the aspect ratio of the video
	console.log(window.outerHeight);
	console.log(screen.height);
},false);

window.onresize = function(){
	if (videoLoaded) {
		console.log(vidToWindowRatio);
		console.log(aspectRatio);
		var newHeight = (window.outerHeight*vidToWindowRatio);
		var newWidth = newHeight*aspectRatio;
		console.log(newWidth);
		widthChange(newWidth);
	} else {
		console.log("video not loaded");
	}
};

function widthChange(width){
    vid.setAttribute("width",width);
}

vidFile.onchange = function(){
		var streambtn = document.getElementById("stream");
		vid.setAttribute("controls", "");
	    streambtn.setAttribute("class", "btn-flat waves-effect waves-light red");
    };

function streamVideo(){
	// Make a separate function to load the video and call it in the main streamVideo() function
	// var source = document.getElementById("video-source");
	// vid.play();
	fragmentMP4();
}

function copyBroadcastURL(){
	generateURL();
	var range = document.createRange();
	range.selectNode(broadcastURL);
	console.log(range);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand("copy");
	Materialize.toast("Link copied to clipboard", 1000);
}

// Function to be modified to contain logic of generating url
function generateURL(){
	broadcastURL.innerHTML = baseURL+peerID;
}

// disconnect the peer from the room
function disconnectPeer(){

}

// Updating the number of peers and getting stream from the peer on connecting to other peers
// Should be updated such that the current peer doesn't have his/her user media appended as a video element in the current page
function addPeer(){
	var peerMediaElements = document.getElementById("peer-media-banner");
	// peerNumUpdated = parseInt(peerNum)+1;
	var peerMediaDiv = document.createElement("div");
	var peerMediaVideo = document.createElement("video");
	peerMediaVideo.setAttribute("class", "z-depth-5");
	var peerMediaSource = document.createElement("source");
	peerMediaVideo.setAttribute("height", "150");
	peerMediaSource.src = "../bbb-cbr-1300-frag.mp4"; // to be updated with UserMedia
	peerMediaSource.id = "user-media-"+peerID;
	peerMediaVideo.appendChild(peerMediaSource);
	peerMediaDiv.setAttribute("class", "col s4");
	peerMediaDiv.appendChild(peerMediaVideo); 
	peerMediaElements.appendChild(peerMediaDiv);
	// peersInRoom[peerNum].peerID = peerID;
	// peerNum = peerNumUpdated;
}	


// ------------------------Fragmenting MP4 in the browser--------------------------------

function fragmentMP4(){
	// Need to be specific for Blink regarding codecs
	mimeCodec = 'video/mp4; codecs="avc1.4d0020"';
	if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
	    var mediaSource = new MediaSource();
	    //create an URL (from mediaSource OBJ) as video's source
	    vid.src = URL.createObjectURL(mediaSource);
	    mediaSource.addEventListener('sourceopen', onSourceOpen);
	}else{
    console.error('Unsupported MIME type or codec: ', mimeCodec);
	}
}

function onSourceOpen(_) {
    console.log("open");
    var mediaSource = this;
    sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    sourceBuffer.segmentIndex = 0;
    sourceBuffer.AppendMode = "sequence";
    sourceBuffer.mode = "sequence";
    var videoFile = vidFile.files[0];
	// var vidURL = URL.createObjectURL(videoFile);
	// vid.src = vidURL;
	// vid.play();
	// if (vid.readyState > 0){
	//     console.log(vid.duration);
	// }
    console.log(videoFile.size);
    var fileRead = new FileReader();
    fileRead.readAsArrayBuffer(videoFile);
    console.log("playback rate = "+vid.playbackRate);
    fileRead.onloadend = function (evt) {
        console.log("2.on response"); 
        var mp4box = new MP4Box();
        var initializeSegments ;  
        var updateCount = 0;
        var bytesAppended = 0;
        var chunkEndTime = []; // Containing different chunks end time
		var currentChunk = 0
		var chunkStartTime = 0
        sourceBuffer.addEventListener('updateend', function (_) {
            if(updateCount < initializeSegments[0].user.segmentIndex){
            	try{
            		if(!sourceBuffer.updating){
		                console.log("8.append_cnt:"+updateCount);
		                console.log(outBuffer[updateCount]);
		                sourceBuffer.appendBuffer(outBuffer[updateCount]); 
		                bytesAppended+=outBuffer[updateCount].byteLength; // outBuffer[updateCount].byteLength is the bytes of current chunk appended
		                console.log(bytesAppended);
		                console.log(durationInSeconds);
		                chunkEndTime[updateCount] = bytesAppended*(durationInSeconds/videoFile.size)
		                console.log(chunkEndTime);
		                if(updateCount == 0){
    		                vid.play();
    		            };
		                updateCount++;
		                // console.log("video played");
		            }
	            }
    	        catch(e){
    	        	console.log(e.name);
    	        	if (e.name == "QuotaExceededError"){
    	        		console.log("clean buffer");
    	        		// var prevChunkEndTime = Math.max.apply(Math, chunkEndTime.filter(function(x){return x <= vid.currentTime}));
    	        		// var currentChunk = chunkEndTime.indexOf(prevChunkEndTime);
    	        		if (vid.currentTime < chunkEndTime[currentChunk]){
    	        			// await sleep(chunkEndTime - vid.currentTime);
    	        			console.log(chunkStartTime, chunkEndTime[currentChunk]);
    	        			cleanBuffer(chunkStartTime, chunkEndTime[currentChunk]);
    	        			currentChunk++;
    	        			chunkStartTime = chunkEndTime[currentChunk-1];
    	        		}else{
    	        			console.log(chunkStartTime, chunkEndTime[currentChunk]);
	    	        		cleanBuffer(chunkStartTime, chunkEndTime[currentChunk]);
	    	        		currentChunk++;
	    	        		chunkStartTime = chunkEndTime[currentChunk-1];
	    	        	}
    	        	}
    	        }
    	        finally{
            		if(!sourceBuffer.updating){
		                console.log("8.append_cnt:"+updateCount);
		                console.log(outBuffer[updateCount]);
		                sourceBuffer.appendBuffer(outBuffer[updateCount]); 
		                bytesAppended+=outBuffer[updateCount].byteLength; // outBuffer[updateCount].byteLength is the bytes of current chunk appended
		                chunkEndTime[updateCount] = Math.ceil(bytesAppended*(videoFile.size/durationInSeconds))
		                updateCount++;
		                vid.play();
		                // console.log("video played");
		            }
	            }
            }else{
                console.log("9.start play");
                vid.play();
            }
        });
        mp4box.onMoovStart = function () {
            console.log("4.Starting to receive File Information");
        };
        var durationInSeconds;
        mp4box.onReady = function(info) {
        	console.log(info);
        	// calculating duration in seconds according to the timescale of the video
        	durationInSeconds = info.duration/info.timescale;
            console.log("5.info.mime:"+info.mime);
            mp4box.onSegment = function (id, user, buffer, sampleNum) {
                console.log("Received segment on track "+id+" for object "+user+" with a length of "+buffer.byteLength+",sampleNum="+sampleNum);
                console.log("user.segmentIndex:"+user.segmentIndex);
                var numChunks = Math.ceil(buffer.byteLength/16384); //16384 bytes = 16kb
                var currentByte = 0
                for(currentChunk = 0; currentChunk < numChunks; currentChunk++){
                    outBuffer[user.segmentIndex] = buffer.slice(currentByte, currentByte+16384);
                    currentByte+=16384;
                    //user.appendBuffer(outBuffer[user.segmentIndex]); 
                    user.segmentIndex++;
                }
            }; 

            var nbSamples = Math.ceil((durationInSeconds/peerNum)*24); //assuming 24 fps
            if (videoFile.size/peerNum > 1048576*149){ // if a chunk size exceeds 150 mb, sourcebuffer quota exceeds
            	var divideNbSamplesBy = Math.ceil(videoFile.size/1048576*150); // 1 MB = 1048576 bytes
            	nbSamples = nbSamples/divideNbSamplesBy;
            }
            console.log(nbSamples);
            var options = { nbSamples: nbSamples };
            mp4box.setSegmentOptions(info.tracks[0].id, sourceBuffer, options);  
            initializeSegments = mp4box.initializeSegmentation();  
            console.log("starting");
            mp4box.start();
            console.log("start->stop");
            mp4box.flush();
            console.log("6.mp4 processing end"); 
        };

        var ab = evt.target.result;
        console.log(ab);
        ab.fileStart = 0;
        console.log("3.mp4 appendBuffer start,start point:"+nextBufferStart); 
        var nextBufferStart = mp4box.appendBuffer(ab);
            
        console.log("7.source buffer appendBuffer start:"); 
        console.log(initializeSegments[0].buffer);
        sourceBuffer.appendBuffer(initializeSegments[0].buffer); 
    };
    console.log("1.on send"); 
}

// ------------------------Finished fragmentation---------------------------------------

// ------------------------Connecting Peers---------------------------------------------

// Function to avoid confusions about new peers and creator of the room
function preInititiation(){
	signalServer = new WebSocket("ws://127.0.0.1:8000/"); // Set to local websocket for now
	signalServer.binaryType = "arraybuffer";
	// setTimeout(function(){
	// signalServer.onopen = function(){
		if (peerID != senderID){
			currentPeer = 0; // Since server ID of the host will always be 0 for a new room
			// addPeer();    // Will resume this function while on the feature of video calling
			initiatePeerConnection(peerID);
		}else{
			console.log(signalServer.readyState);
			// signalServer.send(JSON.stringify({"addRoom": true, "roomID": peerID}));
		}
	// };
	// }, 2000);
}


// Initiating peer connection with the host
function initiatePeerConnection(peerID){
	peerConnection[currentPeer] = new RTCPeerConnection(serverConfig); // Initiation of RTC connection of peers other than host

	peerConnection[currentPeer].onicecandidate = function(evt){
		signalServer.send(JSON.stringify({"candidate": evt.candidate, "peerID": currentPeer["peerID"], "senderID": senderID}));
	};

	peerConnection[currentPeer].onnegotiationneeded = function(){
		peerConnection[currentPeer].createOffer(createLocalDescription(offer, sendOffer), logError());
	};
}

// Create Local description for a new peer in the room(Generate Local description containing session description protocol)
function createLocalDescription(offer, sendOffer){
	return peerConnection[currentPeer].setLocalDescription(offer);
}

// Sending offer to connect(As a callback to createLocalDescription)
function createLocalDescription(offer, sendOffer){
	peerConnection[currentPeer].setLocalDescription(offer);
	sendOffer();
}

// handle message from server to create connections
function gotMessageFromServer(message) {
    // if(!currentPeer) start(false);
    // Getting parsed message from handleMessage

    currentPeer = parseInt(message.server_id); // server ID
    peerConnection[currentPeer] = new RTCPeerConnection(serverConfig);

    if(message.sdp) {
        peerConnection[currentPeer].setRemoteDescription(new RTCSessionDescription(message.sdp), function() {
            if(message.sdp.type == 'offer') {
                peerConnection.createAnswer(createLocalDescription(offer, sendOffer), logError);
            }
        });
    } else if(message.ice) {
        peerConnection[currentPeer].addIceCandidate(new RTCIceCandidate(message.ice));
    }
}

function logError(e) {
    console.log("error occured "+e.name + "with message " + e.message);
}

function cleanBuffer(chunkStart, chunkEnd){
	if(!sourceBuffer.updating){
		console.log(sourceBuffer);
		console.log("start"+chunkStart+" end"+chunkEnd)
		console.log("buffer removing")
		sourceBuffer.remove(parseFloat(chunkStart.toFixed(2)), parseFloat(chunkEnd.toFixed(2)));
		console.log("Buffer removed from "+chunkStart+" sec to "+chunkEnd+" sec");
	}
}
