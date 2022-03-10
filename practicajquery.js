$(document).ready(function(){

	$("#titulo").click(function(){
			$(this).hide();


});

	$("#boton").click(function(){
		$("#e1").fadeToggle("slow");
		$("#e2").fadeToggle(2000);
		$("#e3").fadeToggle();

		$("#e1").fadeTo("slow", 0.20);
		$("#e2").fadeTo("slow", 0.5);
		$("#e3").fadeTo("slow", 0.7);

	});

	$("#lista").click(function(){
		$("#contenido").slideToggle("slow");



	});


});