$(document).ready(function() {
    var $btn = $('#playBtn'),
        audiolizer = $("#canvas").audiolizer({
            defaultAudioUrl: 'movements.mp3',
            onStart: function() {
                $btn.text('Pause');
            },
            onResume: function() {
                $btn.text('Pause');
            },
            onPause: function() {
                $btn.text('Resume');
            },
            onEnded: function() {
                $btn.text('Play');
            },
            onLoad: function() {
                $btn.text('Loading');
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
