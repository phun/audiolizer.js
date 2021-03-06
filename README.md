audiolizer.js
=============
by Phu Nguyen (me@phu.bar)

Circular Audio Visualizer As Made Popular by EDM Channels on Youtube

![Example Image of Audiolizer](assets/example.gif)

# Installation
Import jQuery and the library in your html (assuming lib is in `js/`).
```html
<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>
<script src="//code.jquery.com/jquery-migrate-1.2.1.min.js"></script>
<script src="js/jquery.audiolizer.js"></script>
```
# Usage
Make sure you have a canvas in the DOM. For example
```html
<canvas id="canvas" width="500" height="500"></canvas>
```
In your javascript, initialize the audiolizer using jQuery. You can also pass in optional parameters.
```javascript
$(document).ready(function() {
    var audiolizer = $("#canvas").audiolizer({
        defaultAudioUrl: 'movements.mp3',
        onStart: function() {
            $('#playBtn').text('Pause');
        },
        onResume: function() {
            $('#playBtn').text('Pause');
        },
        onPause: function() {
            $('#playBtn').text('Resume');
        },
        onEnd: function() {
            $('#playBtn').text('Play');
        },
        onLoad: function() {
            $('#playBtn').text('Loading');
        }
    });
```
Now you can play audio by calling `playOrPause()` on the returned object. In this example, I'll use a button to fire it off.
```javascript
$('#playBtn').click(function() {
    audiolizer.playOrPause();
});
```    
