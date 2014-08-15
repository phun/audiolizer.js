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
        }
    });

    $('#playBtn').click(function() {
        audiolizer.playOrPause(); 
    });

    //add the drop event handlers
    document.addEventListener('dragover',function(e){
        e.preventDefault();
    });
    document.addEventListener('drop',function(e) {
        e.preventDefault();

        var reader = new FileReader();
        reader.onload = function(e) {
            audiolizer.loadAudioData(e.target.result, true);
        }

        reader.readAsArrayBuffer(e.dataTransfer.files[0]);
    });
});
