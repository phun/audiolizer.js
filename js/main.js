$(document).ready(function() {
    var audiolizer = $("#canvas").audiolizer({
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
        }
    });

    $('#playBtn').click(function() {
        audiolizer.playOrPause(); 
    });
});
