
function change() {
    document.getElementById("div1").style.color = "red";
}
function comeback() {
    document.getElementById("div1").style.color = "black";
}
function refreshall(precio) {
    var total  =  document.getElementById("total").value;

    var num = parseInt(total);
    num += parseInt(precio);

    document.getElementById("total").value = num.toString();

}