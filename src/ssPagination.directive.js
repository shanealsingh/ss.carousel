(function() {
  'use strict';


  function ssPagination($compile, $ssCarousel) {

  	controller.$inject = ['$scope'];
  	function controller($scope) {

      var self = this;

      // Carousel Service
    	var Carousel;

      // Pages array
    	$scope.pages = [];

      // If the amount of slides change, updates pages array
  		function pageLengthWatcher(newVal, oldVal) {
  			var i;
  			if(newVal > oldVal) {
          i = $scope.pages.length;
          for(; i < newVal; i++) {
            // Add more pages
            $scope.pages.push({ active: false });
          }          
  			} else if(newVal < oldVal) {
          // Remove pages
          $scope.pages = $scope.pages.slice(0, newVal);
        } else {
  				i = 0;
  				for(; i < newVal; i++) {
            // Initalize pages
  					$scope.pages.push({ active: false });
  				}
  			}
  		}

      // Initalize the Carousel and listen for page index changes
  		function initCarousel() {
	    	$ssCarousel.get($scope.id).then(function(carousel) {
	    		Carousel = carousel;
	    		Carousel.onPageChanged(onPageChanged);
	    		$scope.$watch(function() { return Carousel.pageLength; }, pageLengthWatcher);
	    	});
	    }


      // TODO: figure out a better way to do this
      // Initalize the caousel when the id is known and remove the watcher
			var watch = $scope.$watch('id', function(val) {
				if(!val) { return; }
				initCarousel();
				watch();
			});


      // Set the current page index when page item is clicked
    	$scope.pageClicked = function(index) {
        if(Carousel.pageIndex !== index) {
          Carousel.toPage(index);
        }
    	};


      // When the page has changed loop through and
      // set the current page item as active
      function onPageChanged(index) {
        angular.forEach($scope.pages, function(page, i) {
          page.active = (i === index);
        });        
      }


      // Gets called when the dom elements have finished rendering
      self.ngRepeatDone = function() {
        $scope.pages[Carousel.pageIndex].active = true;
      };

      // Clean up
      $scope.$on('$destroy', function() {
        Carousel.unbindPageChanged(onPageChanged);
        Carousel = null;
      });
  	}


    function link(scope, element, attrs, ctrl) {

      // Set the id of the carousel so controller has access to it
    	scope.id = ctrl.id;

      // Get the pagination item
    	var item = angular.element(element[0].querySelector('.ss-pagination-item'));

      // Add an ng-repeat
    	item.attr('ng-repeat', 'page in pages');

      // Add click so pagination item can call pageClicked
    	item.attr('ng-click', 'pageClicked($index)');

      // Sets the active class
      item.attr('ng-class', "{'active': page.active}");

      // Recompile template
    	$compile(element.contents())(scope);
    	element.addClass('initalized');
    }

    return {
      restrict: 'EA',
      scope: true,
      require: '^ssCarousel',
      link: link,
      controller: controller
    };
  }


  function ssPaginationItem() {

    function link(scope, element, attr, ctrl) {
    	element.addClass('ss-pagination-item');
    	if(scope.$last) { ctrl.ngRepeatDone(); }
    }

    return {
      restrict: 'EA',
      link: link,
      require: '^ssPagination'
    };
  }


  angular
    .module('ss.carousel')
    .directive('ssPagination', ssPagination)
    .directive('ssPaginationItem', ssPaginationItem);

})();

