var K = function(){};
K.commit = function(){
  console.log('class methid');
};

function Test() {

}

Test.prototype.commit = function() {
  K.commit();
};

var test = new Test();
test.commit(); 