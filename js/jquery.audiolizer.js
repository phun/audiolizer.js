/*******************************************************************************
The MIT License (MIT)

Copyright (c) 2014 Phu Nguyen (me@phu.bar)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*******************************************************************************/
(function ($) {

    // Helper function to get average value in array
    function getAvg(arr) {
        var cnt, tot, i;
        cnt = arr.length;
        tot = i = 0;
        while (i < cnt) tot+= arr[i++];
        return tot / cnt;
    }

    $.fn.audiolizer = function(options) {

        var settings = $.extend({
            // These are the defaults.
            fftSize: 1024 * 2,
            width: this.width(),
            circleColor: 'black',
            barColor: 'black',
            lineColor: 'white',

            // Callback for when a song is starting  
            onStart: null,
            // Callback for when a song is resumed from pause  
            onResume: null,
            // Callback for when a song is paused
            onPause: null,
            // Callback for when a song ends
            onEnd: null,
            // Callback for when a song is still being loaded
            onLoad: null
        }, options );

        settings.radius = (options && options.radius) ? options.radius : settings.width/2 * 0.7;
        settings.circumference = 2 * Math.pi * settings.radius;

        var STATE_PLAY = 3,
            STATE_PAUSE = 2,
            STATE_STOP = 0;

        var context = new AudioContext();
        var audioBuffer;
        var analyser;
        var javascriptNode;
        var fftSize = 1024 * 2;
        var state = STATE_STOP;

        // Used to pause and play the media file
        var startOffset = 0;
        var startTime = 0;

        // get the context from the canvas to draw on
        var ctx = this.get()[0].getContext("2d");

        // load the sound
        setupAudioNodes();

        function setupAudioNodes() {

            // setup a javascript node
            window.javascriptNode = context.createScriptProcessor(2048, 1, 1);
            // connect to destination, else it isn't called
            window.javascriptNode.connect(context.destination);


            // setup a analyzer
            analyser = context.createAnalyser();
            analyser.smoothingTimeConstant = 0.5;
            analyser.fftSize = fftSize;

            // create a buffer source node
            sourceNode = context.createBufferSource();
            sourceNode.connect(analyser);
            analyser.connect(window.javascriptNode);

            sourceNode.connect(context.destination);
        }

        // load the specified sound
        function loadSoundFromUrl(url, callback) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';

            // When loaded decode the data
            request.onload = function() {

                // decode the data
                context.decodeAudioData(request.response, function(buffer) {
                    // when the audio is decoded play the sound
                    this.buffer = buffer;
                    console.log(callback);
                    if (callback) {
                        callback();
                    }
                }, onError);
            }
            request.send();
        }

        function loadSound(buffer, play) {
            this.buffer = buffer;
            startOffset = 0;
            startTime = 0;

            if (play) playSound(); 
        }

        function playOrPause() {
          if (state == STATE_PLAY) {
              pauseSound();
          } else {
              playSound();
          }
        }

        function pauseSound() { 
            if (state == STATE_PLAY) {
                sourceNode.stop();
                startOffset += context.currentTime - startTime;
                state = STATE_PAUSE;
                if (settings.onPause) {
                    settings.onPause();
                }
            }
        }

        function playSound() {
            if (!this.buffer) {
                loadSoundFromUrl('Bird.mp3', playSound);
                return;
            }
            if (state == STATE_PLAY) {
                state = STATE_STOP;
                sourceNode.stop();
            }
            startTime = context.currentTime;
            sourceNode = context.createBufferSource();
            sourceNode.buffer = this.buffer;
            sourceNode.connect(analyser);
            sourceNode.connect(context.destination);
            // Start playback, but make sure we stay in bound of the buffer.
            sourceNode.start(0, startOffset % buffer.duration);
            state = STATE_PLAY;
            if (settings.onResume) {
                settings.onResume();
            }
        }

        // log if an error occurs
        function onError(e) {
            console.log(e);
        }

        // when the javascript node is called
        // we use information from the analyzer node
        // to draw the volume
        window.javascriptNode.onaudioprocess = function() {

            // Analyzer uses FFT to analyze all fo the frequencies real time
            // frequency bin count is basically the number of frequencies it's analyzing
            var freqDomain =  new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(freqDomain);
            var timeDomain = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(timeDomain);


            // clear the current state
            ctx.clearRect(0, 0, settings.width, settings.width);

            ctx.beginPath();
            ctx.arc(settings.width/2, settings.width/2, settings.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = settings.circleColor;
            ctx.fill();
            ctx.strokeStyle = settings.circleColor;
            ctx.lineWidth = 0;
            ctx.stroke();
            drawSpectrum(freqDomain);
            drawTimeSpectrum(timeDomain);
        }

        function drawSpectrum(array) {
            var cut = getAvg(array) * 2/3;
            for (var i = 0; i < (array.length/8-32); i++) {
                var value = array[i*8+16] - cut;
                if (value < 0) value = 0;
                var percent = value / (256 - cut);
                var angle = (2*Math.PI/(array.length/8-32)) * (i+1);
                var cx = settings.width/2 + settings.radius * Math.cos(angle);
                var cy = settings.width/2 + settings.radius * Math.sin(angle);
                var length = settings.width * 0.15 * percent;
                var x = cx + (length) * Math.cos(angle);
                var y = cy + (length) * Math.sin(angle);
                ctx.beginPath();
                ctx.strokeStyle = settings.barColor;
                ctx.lineWidth = settings.width * 0.018;
                ctx.moveTo(cx, cy);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        };

        function drawTimeSpectrum(array) {
            var points = [];
            for (var i = 0; i < (array.length); i++) {
                var value = array[i];
                var percent = value / 256;
                var angle = (2*Math.PI/array.length) * (i+1);
                var length = settings.radius/2 * percent;
                var x = settings.width/2 + (settings.radius * 3/4 + length) * Math.cos(angle);
                var y = settings.width/2 + (settings.radius * 3/4 + length) * Math.sin(angle);
                points.push({'x': x, 'y': y});
                // ctx.beginPath();
                // ctx.fillStyle="white";
                // ctx.fillRect(x, y, 4, 4);
                // ctx.stroke();
            }
            ctx.beginPath();
            ctx.strokeStyle = settings.lineColor;
            ctx.lineWidth = 2;
            ctx.moveTo(points[0].x, points[0].y);
            for (var i = 1; i < points.length-2; i++) {
                var xc = (points[i].x + points[i + 1].x) / 2;
                var yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            // curve through the last two points
            ctx.quadraticCurveTo(points[i].x, points[i].y, points[i+1].x,points[i+1].y);
            ctx.quadraticCurveTo(points[i+1].x, points[i+1].y, points[0].x,points[0].y);
            ctx.stroke();
        }


        return {
            playOrPause: function() {
                playOrPause();
            },
            loadAudio: function(buffer, play) {
                loadAudio(buffer, play);
            }
        }
    }
}(jQuery));
