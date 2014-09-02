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
            // Callback for when a song is resuming from pause  
            onResume: null,
            // Callback for when a song is pausing
            onPause: null,
            // Callback for when a song is ended
            onEnded: null,
            // Callback for when a song is loading
            onLoad: null
        }, options );

        settings.radius = (options && options.radius) ? options.radius : settings.width/2 * 0.7;
        settings.circumference = 2 * Math.pi * settings.radius;

        var STATE_PLAY = 3,
            STATE_PAUSE = 2,
            STATE_STOP = 0;

        var context = createAudioContext(),
            audioBuffer,
            analyser,
            javascriptNode,
            state = STATE_STOP,
            startOffset = 0,
            startTime = 0,
            ctx = this.get()[0].getContext("2d");


        function createAudioContext() {
            if ('webkitAudioContext' in window) {
               return new webkitAudioContext();
            } else if ('AudioContext' in window) {
                return new AudioContext();
            }
        }

        function setupAudioNodes() {
            window.javascriptNode = context.createScriptProcessor(2048, 1, 1);
            window.javascriptNode.connect(context.destination);
            window.javascriptNode.onaudioprocess = function() { draw(); };

            analyser = context.createAnalyser();
            analyser.smoothingTimeConstant = 0.5;
            analyser.fftSize = settings.fftSize;

            sourceNode = context.createBufferSource();
            sourceNode.connect(analyser);
            sourceNode.connect(context.destination);

            analyser.connect(window.javascriptNode);
        }

        function loadFromUrl(url, play) {
            var request = new XMLHttpRequest();

            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.onload = function() {
                loadAudioData(request.response, play);
            }
            request.send();
        }

        function loadAudioData(buffer, play) {
            if (context.decodeAudioData) {
                if (settings.onLoad) settings.onLoad();
                context.decodeAudioData(buffer, function(b) {
                    audioBuffer = b;
                    startOffset = 0;
                    startTime = 0;

                    if (play) playSound(); 
                });
            }
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
                startOffset += context.currentTime - startTime;
                sourceNode.stop(startOffset);
                state = STATE_PAUSE;

                if (settings.onPause) settings.onPause();
            }
        }

        function playSound() {
            if (!audioBuffer && settings.defaultAudioUrl) {
                loadFromUrl(settings.defaultAudioUrl, true);
                return;
            } else if (!audioBuffer) {
                return;
            }

            if (state == STATE_PLAY) {
                state = STATE_STOP;
                sourceNode.stop();
            }
            startTime = context.currentTime;
            sourceNode = context.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(analyser);
            sourceNode.connect(context.destination);
            // Start playback, but make sure we stay in bound of the buffer.
            sourceNode.start(0, startOffset % audioBuffer.duration);

            sourceNode.onended = function(e) {
                state = STATE_STOP;
                startOffset = 0;
                startTime = 0;
                if (settings.onEnded) {
                    settings.onEnded(e);
                }
            };

            state = STATE_PLAY;
            if (settings.onResume) {
                settings.onResume();
            }
        }

        function draw() {
            var freqDomain = new Uint8Array(analyser.frequencyBinCount),
                timeDomain = new Uint8Array(analyser.frequencyBinCount);

            analyser.getByteFrequencyData(freqDomain);
            analyser.getByteTimeDomainData(timeDomain);

            clearCanvas();

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


        function clearCanvas() {
            ctx.clearRect(0, 0, settings.width, settings.width);
        }

        function drawSpectrum(array) {
            for (var i = 0; i < (array.length/8-32); i++) {
                var cut = getAvg(array) * 2/3,
                    value = array[i*8+16] - cut;

                if (value < 0) value = 0;

                var percent = value / (256 - cut),
                    angle = (2*Math.PI/(array.length/8-32)) * (i+1),
                    cx = settings.width/2 + settings.radius * Math.cos(angle),
                    cy = settings.width/2 + settings.radius * Math.sin(angle),
                    length = settings.width * 0.15 * percent,
                    x = cx + (length) * Math.cos(angle),
                    y = cy + (length) * Math.sin(angle);

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
                var value = array[i],
                    percent = value / 256,
                    angle = (2*Math.PI/array.length) * (i+1),
                    length = settings.radius/2 * percent,
                    x = settings.width/2 + (settings.radius * 3/4 + length) * Math.cos(angle),
                    y = settings.width/2 + (settings.radius * 3/4 + length) * Math.sin(angle);

                points.push({'x': x, 'y': y});
            }

            ctx.beginPath();
            ctx.strokeStyle = settings.lineColor;
            ctx.lineWidth = 2;
            ctx.moveTo(points[0].x, points[0].y);

            for (var i = 1; i < points.length-2; i++) {
                var xc = (points[i].x + points[i + 1].x) / 2,
                    yc = (points[i].y + points[i + 1].y) / 2;

                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }

            // Connect the circle
            ctx.quadraticCurveTo(points[i].x, points[i].y, points[i+1].x,points[i+1].y);
            ctx.quadraticCurveTo(points[i+1].x, points[i+1].y, points[0].x,points[0].y);
            ctx.stroke();
        }

        setupAudioNodes();

        return {
            playOrPause: function() {
                playOrPause();
            },
            loadAudioData: function(buffer, play) {
                loadAudioData(buffer, play);
            }
        }
    }
}(jQuery));
