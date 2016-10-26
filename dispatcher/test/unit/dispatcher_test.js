const logger = require('log4js').getLogger('Dispatcher unit test');
const chai = require('chai'),
      expect = chai.expect;
const mongoose = require('mongoose');
const dispatcher = require('../../lib/Dispatcher');

describe('Dispatcher', function () {
  let shortsP = ['A', 'B', 'C', 'D', 'E'];
  let shortsS = ['a', 'b', 'c'];
	
  before(function (done) {
    let orgs = [
      {orgCode: 'prison1', orgType: 'p', shortNumbers: ['AA', 'BB', 'CC', 'DD']},
      {orgCode: 'justice1', orgType: 's', shortNumbers: ['aa', 'bb']},
      {orgCode: 'prison2', orgType: 'p', shortNumbers: ['EE', 'FF']},
      {orgCode: 'justice2', orgType: 's', shortNumbers: ['cc', 'dd']}
    ];

    mongoose.connection.collection('orgnizations').insertMany(orgs, (err, res) => {
      if (err) {
        logger.error(err);
        done(err);
      }
      done();
    });
   
  });

  after(function (done) {
    mongoose.connection.db.dropCollection('orgnizations', function(err) {
      if (err) {
        logger.error(err);
        done(err);
      } else {
        done();
      }
    });
  });
	
  describe('#pendingPositions()', function () {

		it('expect an empty array when P is not present', function () {
			expect(dispatcher.pendingPositions([])).to.be.empty;
		});

		it('expect an array with 1 element and value is 0', function () {
			expect(dispatcher.pendingPositions(['P', 'A'])).to.have.length(1);
			expect(dispatcher.pendingPositions(['P', 'A'])[0]).to.equal(0);
		});

		it('expect an array with 2 elements and value is [0,1]', function () {
			expect(dispatcher.pendingPositions(['P', 'P', 'A'])).to.have.length(2);
			expect(dispatcher.pendingPositions(['P', 'P', 'A']).toString()).to.equal([0, 1].toString());
		});

  });

  describe('#init', function () {

    it('expect code with 400', function (done) {
      dispatcher.init('0991999', '0997999', '2016-08-25', 'undefined', function (err, res) {
        if (err) done(err);
        expect(res).to.have.property('code').and.equal(400);
        done();
      });
    });

    it('expect code with 200', function (done) {
      dispatcher.init('prison1', 'justice1', '2016-08-25', 'undefined', function (err, res) {
        if (err) {
		      logger.error(err);
		      done(err);
		    } else {
					expect(res).to.have.property('code').and.equal(200);
					done();
				}

      });
    });

  });

  describe('#availablePositions(schedule, shortNumbers)', function () {

    describe('schedules of justice is empty', function () {
      let pos = dispatcher.availablePositions([], shortsS);

			it('expect an array with 3 elements', function () {
				expect(pos).to.have.length(3);
			});

      it('expect array of avilable pos each element is 0', function () {
				pos.forEach(function (a) {
					expect(a[1][0]).to.be.equal(0);
				});
			});
    });

    describe('schedules of justice is not empty but not fill complete', function () {
      let pos = dispatcher.availablePositions([['A']], shortsS);

      it('expect an array with 3 elements', function () {
				expect(pos).to.have.length(3);
				expect(pos[0][1][0]).to.be.equal(1);
				expect(pos[1][1][0]).to.be.equal(0);
				expect(pos[2][1][0]).to.be.equal(0);
      });
    });

    describe('schedules length equals to short numbers length', function () {
      let pos = dispatcher.availablePositions([['A'], ['B'], ['C']], shortsS);

			it('expect an array with 3 elements', function () {
				expect(pos).to.have.length(3);
				expect(pos[0][1][0]).to.be.equal(1);
				expect(pos[1][1][0]).to.be.equal(1);
				expect(pos[2][1][0]).to.be.equal(1);
			});

    });

    describe('schedules suit', function () {
      let pos = dispatcher.availablePositions([['A', 'D'], ['B'], ['C']], shortsS);

			it('expect an array with 3 elements', function () {
				expect(pos).to.have.length(3);
				expect(pos[0][1][0]).to.be.equal(2);
				expect(pos[1][1][0]).to.be.equal(1);
				expect(pos[2][1][0]).to.be.equal(1);
			});

    });

    describe('schedules with pendings', function () {
      let pos = dispatcher.availablePositions([['P', 'D'], ['P', 'B'], ['P', 'C']], shortsS);

			it('expect an array with 3 elements', function () {
				expect(pos).to.have.length(3);
				expect(pos[0][1][0]).to.be.equal(0);
				expect(pos[0][1][1]).to.be.equal(2);
				expect(pos[1][1][0]).to.be.equal(0);
				expect(pos[1][1][1]).to.be.equal(2);
				expect(pos[2][1][0]).to.be.equal(0);
				expect(pos[2][1][1]).to.be.equal(2);
			});

    });

    describe('schedule suit 4', function () {
      let pos = dispatcher.availablePositions([['A', 'P', 'E'], ['B'], ['C']], shortsS);
      it('expect', function () {
				expect(pos[0][1][0]).to.be.equal(1);
      });
    });
  });

  describe('#availablePositions', function () {
		it('hehe', function () {
			let schedule = [];
			expect(dispatcher.availablePositions(schedule, shortsP)).to.have.length(5);
		});
  });

  describe('#flatten', function () {
    it('expect an array with 3 elements and value equals 0 which index is 1', function () {
      let flatted = dispatcher.flatten([[0, [0]], [1, [0]], [2, [0]]]);
      expect(flatted).to.have.length(3);
      expect(flatted[1]).to.be.equal(0);
		});

		it('expect an array with 13 elements and value equals 3 which index is 11', function () {
			let flatted = dispatcher.flatten([
				[0, [0, 1, 2]], [1, [3, 4]], [2, [0]], [3, [2, 3, 4]], [4, [0, 2, 3, 4]]
  	  	]);
			expect(flatted).to.have.length(13);
			expect(flatted[11]).to.be.equal(3);
		});
  });

  describe('#matchedPosition(array1, array2)', function () {
		let array1 = dispatcher.flatten([
			[0, [1, 2]], [1, [3, 4]], [2, [0]], [3, [2, 3, 4]], [4, [0, 2, 3, 4]]
		]);

		let array2 = dispatcher.flatten([
			[0, [0]], [1, [0]], [2, [0]]
		]);

    let array3 = dispatcher.flatten([
			[0, [5]]
		]);

    it('expect an hash with 3 properties', function () {
      let res = dispatcher.matchedPosition(array1, array2);
      expect(res).to.have.all.keys('p', 's', 'pos');
      expect(res).to.deep.equal({ p: 4, s: 0, pos: 0 });
    });

    it('expect an hash with 3 properties, but each value is -1', function () {
      let res = dispatcher.matchedPosition(array1, array3);
      expect(res).to.have.all.keys('p', 's', 'pos');
      expect(res).to.deep.equal({ p: -1, s: -1, pos: -1 });
    });

  });

  describe('#findCorrespondingIndex', function () {
		let array1 = [
			[0, [0]], [1, [0]], [2, [0]], [3, [0]]
		];

		let array2 = [
	  	  [0, [1, 2]], [1, [3, 4]], [2, [0]], [3, [2, 3, 4]], [4, [0, 2, 3, 4]]
	  	];

		let array3 = [
			[0, [1, 2]], [1, [3, 10]], [2, [11]], [3, [2, 3, 12]], [4, [0, 2, 3, 13]]
		];

		let array4 = [
			[0, [1]], [1, [0]], [2, [0]], [3, [0]]
		];

		it('expect correspanding index 0', function () {
			let res = dispatcher.findCorrespondingIndex(array1, 0);
			expect(res).to.be.equal(0);
		});

		it('expect correspanding index 3', function () {
			let res = dispatcher.findCorrespondingIndex(array2, 11);
			expect(res).to.be.equal(4);
		});

		it('expect correspanding index 2', function () {
			let res = dispatcher.findCorrespondingIndex(array3, 4);
			expect(res).to.be.equal(2);
		});

		it('expect correspanding index 1', function () {
			let res = dispatcher.findCorrespondingIndex(array4, 0);
			expect(res).to.be.equal(0);
		});
  });

  describe('#largestPos(array)', function () {
		it('expect an array with largest element index and value', function () {
			let array = [4, 0, 1, 3, 2];
			let array2 = [0,2,1,4,3];
			let array3 = [1,0,3,4,5,2,9];
			let array4 = [1,2,3,10,11,2,3,12,0,2,3,13];
			expect(dispatcher.largestPos(array)).to.be.eql([0, 4]);
			expect(dispatcher.largestPos(array2)).to.be.eql([3, 4]);
			expect(dispatcher.largestPos(array3)).to.be.eql([6, 9]);
			expect(dispatcher.largestPos(array4)).to.be.eql([3, 10]);
		});
  });


  // describe('#dispatch(prison, shortP, justice, shortS)', function () {

  //   let prison1 = { schedule: [] };
  //   let prison2 = { schedule: [] };
  //   let prison3 = { schedule: [] };
  //   let prison4 = { schedule: [] };

	// 	let sfs1 = { schedule: [] };
	// 	let sfs2 = { schedule: [] };
	// 	let sfs3 = { schedule: [] };
	// 	let sfs4 = { schedule: [] };
  //   let sfs5 = { schedule: [] };

	// 	let p1 = ['A', 'B', 'C', 'D', 'E', 'F'];
  //   let p2 = ['G', 'H', 'I', 'G', 'K', 'L'];
  //   let p3 = ['M', 'N', 'O', 'Q', 'R'];
  //   let p4 = ['S', 'T', 'U', 'V', 'W', 'X', 'Y'];

  //   let s1 = ['a', 'b', 'c'];
  //   let s2 = ['d', 'e', 'f'];
  //   let s3 = ['g', 'h', 'i'];
  //   let s4 = ['j', 'k', 'l'];
  //   let s5 = ['m', 'n', 'o'];

	// 	it('sfs1 applies prison1 ', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs1, s1);

	// 		expect(prison1.schedule).to.have.length(1);
	// 		expect(prison1.schedule[0]).to.include('a');

	// 		expect(sfs1.schedule).to.have.length(1);
	// 		expect(sfs1.schedule[0]).to.include('A');

	// 	});

	// 	it('sfs2 applies prison1', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs2, s2);

	// 		expect(prison1.schedule).to.have.length(2);
	// 		expect(prison1.schedule[1]).to.include('d');

	// 		expect(sfs2.schedule).to.have.length(1);
	// 		expect(sfs2.schedule[0]).to.include('B');
	// 	});

	// 	it('sfs2 applies prison1 again', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs2, s2);

  //  	  expect(prison1.schedule).to.have.length(3);
	// 		expect(prison1.schedule[2]).to.include('e');

	// 		expect(sfs2.schedule).to.have.length(2);
	// 		expect(sfs2.schedule[1]).to.include('C');
	// 	});

	// 	it('sfs2 applies prison2', function () {
	// 		dispatcher.dispatch(prison2, p2, sfs2, s2);

	// 		expect(prison2.schedule).to.have.length(1);
	// 		expect(prison2.schedule[0]).to.include('f');

	// 		expect(sfs2.schedule).to.have.length(3);
	// 		expect(sfs2.schedule[2]).to.include('G');
	// 	});

	// 	it('sfs3 applies prison1', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs3, s3);

	// 		expect(prison1.schedule).to.have.length(4);
	// 		expect(prison1.schedule[3]).to.include('g');

	// 		expect(sfs3.schedule).to.have.length(1);
	// 		expect(sfs3.schedule[0]).to.include('D');
	// 	});

	// 	it('sfs4 applies prison3', function () {
	// 		dispatcher.dispatch(prison3, p3, sfs4, s4);

	// 		expect(prison3.schedule).to.have.length(1);
	// 		expect(prison3.schedule[0]).to.include('j');

	// 		expect(sfs4.schedule).to.have.length(1);
	// 		expect(sfs4.schedule[0]).to.include('M');
	// 	});

	// 	it('sfs4 applies prison1', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs4, s4);

	// 		expect(prison1.schedule).to.have.length(5);
	// 		expect(prison1.schedule[4]).to.include('k');

	// 		expect(sfs4.schedule).to.have.length(2);
	// 		expect(sfs4.schedule[1]).to.include('E');
	// 	});

	// 	it('sfs4 applies prison1 again', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs4, s4);

	// 		expect(prison1.schedule).to.have.length(6);
	// 		expect(prison1.schedule[5]).to.include('l');

	// 		expect(sfs4.schedule).to.have.length(3);
	// 		expect(sfs4.schedule[2]).include('F');
	// 	});

	// 	it('sfs1 applies prison1 again', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs1, s1);

	// 		expect(prison1.schedule).to.have.length(6);
	// 		expect(prison1.schedule[0][1]).to.include('a');

	// 		expect(sfs1.schedule).to.have.length(1);
	// 		expect(sfs1.schedule[0][1]).include('A');
	// 	});

	// 	it('sfs1 applies prison1 again', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs1, s1);

	// 		expect(prison1.schedule).to.have.length(6);
	// 		expect(prison1.schedule[0][2]).to.include('a');

	// 		expect(sfs1.schedule).to.have.length(1);
	// 		expect(sfs1.schedule[0][2]).include('A');
	// 	});

	// 	it('sfs1 applies prison2 again', function () {
	// 		dispatcher.dispatch(prison2, p2, sfs1, s1);

	// 		expect(prison2.schedule).to.have.length(2);
	// 		expect(prison2.schedule[1][0]).to.include('b');

	// 		expect(sfs1.schedule).to.have.length(2);
	// 		expect(sfs1.schedule[1][0]).include('H');
	// 	});

	// 	it('sfs1 applies prison3', function () {
	// 		dispatcher.dispatch(prison3, p3, sfs1, s1);

	// 		expect(prison3.schedule).to.have.length(2);
	// 		expect(prison3.schedule[1][0]).to.include('c');

	// 		expect(sfs1.schedule).to.have.length(3);
	// 		expect(sfs1.schedule[2][0]).include('N');
	// 	});

	// 	it('sfs1 applies prison3 again', function () {
	// 		dispatcher.dispatch(prison3, p3, sfs1, s1);

	// 		expect(prison3.schedule).to.have.length(2);
	// 		expect(prison3.schedule[0][1]).to.include('b');

	// 		expect(sfs1.schedule).to.have.length(3);
	// 		expect(sfs1.schedule[1][1]).include('M');
	// 	});

	// 	it('sfs1 applies prison2 again', function () {
	// 		dispatcher.dispatch(prison2, p2, sfs1, s1);

	// 		expect(prison2.schedule).to.have.length(2);
	// 		expect(prison2.schedule[0][1]).to.include('c');

	// 		expect(sfs1.schedule).to.have.length(3);
	// 		expect(sfs1.schedule[2][1]).include('G');
	// 	});

	// 	it('sfs3 applies prison3', function () {
	// 		dispatcher.dispatch(prison3, p3, sfs3, s3);

	// 		expect(prison3.schedule).to.have.length(3);
	// 		expect(prison3.schedule[2][0]).to.include('h');

	// 		expect(sfs3.schedule).to.have.length(2);
	// 		expect(sfs3.schedule[1][0]).include('O');
	// 	});

	// 	it('sfs2 applies prison2', function () {
	// 		dispatcher.dispatch(prison2, p2, sfs2, s2);

	// 		expect(prison2.schedule).to.have.length(2);
	// 		expect(prison2.schedule[1][1]).to.include('d');

	// 		expect(sfs2.schedule).to.have.length(3);
	// 		expect(sfs2.schedule[0][1]).include('H');
	// 	});

	// 	it('sfs2 applies prison2 again', function () {
	// 		dispatcher.dispatch(prison2, p2, sfs2, s2);

	// 		expect(prison2.schedule).to.have.length(2);
	// 		expect(prison2.schedule[0][2]).to.include('d');

	// 		expect(sfs2.schedule).to.have.length(3);
	// 		expect(sfs2.schedule[0][2]).include('G');
	// 	});

	// 	it('sfs3 applies prison3', function () {
	// 		dispatcher.dispatch(prison3, p3, sfs3, s3);

	// 		expect(prison3.schedule).to.have.length(4);
	// 		expect(prison3.schedule[3][0]).to.include('i');

	// 		expect(sfs3.schedule).to.have.length(3);
	// 		expect(sfs3.schedule[2][0]).include('Q');
	// 	});

	// 	it('sfs1 applies prison4', function () {
	// 		dispatcher.dispatch(prison4, p4, sfs1, s1);

	// 		expect(prison4.schedule).to.have.length(1);
	// 		expect(prison4.schedule[0][0]).to.include('P');
	// 		expect(prison4.schedule[0][1]).to.include('P');
	// 		expect(prison4.schedule[0][2]).to.include('P');
	// 		expect(prison4.schedule[0][3]).to.include('a');

	// 		expect(sfs1.schedule).to.have.length(3);
	// 		expect(sfs1.schedule[0][3]).include('S');
	// 	});

	// 	it('sfs4 applies prison4', function () {
	// 		dispatcher.dispatch(prison4, p4, sfs4, s4);

	// 		expect(prison4.schedule).to.have.length(1);
	// 		expect(prison4.schedule[0][1]).to.include('j');

	// 		expect(sfs4.schedule).to.have.length(3);
	// 		expect(sfs4.schedule[0][1]).include('S');
	// 	});

	// 	it('sfs4 applies prison4', function () {
	// 		dispatcher.dispatch(prison4, p4, sfs4, s4);

	// 		expect(prison4.schedule).to.have.length(1);
	// 		expect(prison4.schedule[0][1]).to.include('j');

	// 		expect(sfs4.schedule).to.have.length(3);
	// 		expect(sfs4.schedule[0][1]).include('S');
	// 	});

	// 	it('sfs4 applies prison4', function () {
	// 		dispatcher.dispatch(prison4, p4, sfs4, s4);

	// 		expect(prison4.schedule).to.have.length(1);
	// 		expect(prison4.schedule[0][4]).to.include('j');

	// 		expect(sfs4.schedule).to.have.length(3);
	// 		expect(sfs4.schedule[0][3]).include('P');
	// 		expect(sfs4.schedule[0][4]).include('S');
	// 	});

	// 	it('sfs4 applies prison2', function () {
	// 		dispatcher.dispatch(prison2, p2, sfs4, s4);

	// 		expect(prison2.schedule).to.have.length(2);
	// 		expect(prison2.schedule[0][3]).to.include('j');

	// 		expect(sfs4.schedule[0][3]).include('G');
	// 		expect(sfs4.schedule[0][4]).include('S');
	// 	});

	// 	it('sfs5 applies prison4', function () {
	// 		dispatcher.dispatch(prison4, p4, sfs5, s5);

	// 		expect(prison4.schedule).to.have.length(1);
	// 		expect(prison4.schedule[0][0]).to.include('m');

	// 		expect(sfs5.schedule).to.have.length(1);
	// 		expect(sfs5.schedule[0][0]).include('S');
	// 	});

	// 	it('sfs5 applies prison1', function () {
	// 		dispatcher.dispatch(prison1, p1, sfs5, s5);

	// 		expect(prison1.schedule).to.have.length(6);
	// 		expect(prison1.schedule[1][1]).to.include('m');

	// 		expect(sfs5.schedule).to.have.length(1);
	// 		expect(sfs5.schedule[0][1]).include('B');
	// 	});

	// 	it('sfs3 applies prison3', function () {
	// 		dispatcher.dispatch(prison3, p3, sfs3, s3);

	// 		expect(prison3.schedule).to.have.length(4);
	// 		expect(prison3.schedule[1][1]).to.include('g');

	// 		expect(sfs3.schedule).to.have.length(3);
	// 		expect(sfs3.schedule[0][1]).include('N');
	// 	});
  // });

	describe('#redispatch', function() {
		let meetingP = {orgType: 'p', orgCode: 'prison1', schedule:[['a', 'b', 'c', 'd'],['e','f'],['g', 'h']]};
		let meetingS = {orgType: 's', orgCode: 'justice1', schedule:[['A', 'B', 'C'],['E','F'],['G']]};

		it('expect an array [X, 5, z]', function() {
			let res = dispatcher.redispatch(meetingP, ['W','X', 'Y', 'Z'], meetingS, ['x', 'y', 'z'], 4);
			expect(res).to.have.length(3);
			expect(res).to.be.eql(['X', 5, 'z']);
		});
	});

	describe('#dispatch', function() {
		let prison1 =  {schedule: []};

		let justice1 = {schedule: []};
		let justice2 = {schedule: []};
		let justice3 = {schedule: []};
		let justice4 = {schedule: []};
		let justice5 = {schedule: []};

		let p1 = ['A', 'B', 'C', 'D', 'E'];

		let j1 = ['a', 'b'];
		let j2 = ['c', 'd'];
		let j3 = ['e'];
		let j4 = ['f', 'h', 'i'];
		let j5 = ['g'];

		it('expect dispatch', function() {
			dispatcher.dispatch(prison1, p1, justice1, j1);
			dispatcher.dispatch(prison1, p1, justice2, j2);
			dispatcher.dispatch(prison1, p1, justice3, j3);
			dispatcher.dispatch(prison1, p1, justice4, j4);
			dispatcher.dispatch(prison1, p1, justice5, j5);

			dispatcher.dispatch(prison1, p1, justice2, j2);
			dispatcher.dispatch(prison1, p1, justice3, j3);
			dispatcher.dispatch(prison1, p1, justice4, j4);
			dispatcher.dispatch(prison1, p1, justice5, j5);
			logger.debug(prison1);
			logger.debug(justice5);
			// dispatcher.dispatch(prison1, p1, justice1, j1);
			// dispatcher.dispatch(prison1, p1, justice1, j1);
			// dispatcher.dispatch(prison1, p1, justice1, j1);
			// dispatcher.dispatch(prison1, p1, justice1, j1);
		});

	});

});