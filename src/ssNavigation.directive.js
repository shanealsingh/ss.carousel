(function() {
  'use strict';


  var ssNavigation = function(func) {
    ret.$inject = ['$ssCarousel'];
    function ret($ssCarousel) {


      function link($scope, $element, $attrs, ctrl) {
        $element.bind('click', click);

        // Get a reference to the carousel
        var Carousel;
        $ssCarousel.get(ctrl.id).then(function(carousel) {
          Carousel = carousel;
        });


        function click() {
          $scope.$apply(function() { Carousel[func](); });
        }


        $scope.$on('$destroy', function() {
          $element.unbind('click');
          Carousel = null;
        });
      }


      return {
        restrict: 'EA',
        require: '^ssCarousel',
        link: link
      };
    }

    return ret;
  };


  angular
    .module('ss.carousel')
    .directive('ssNextSlide', new ssNavigation('nextSlide'))
    .directive('ssPrevSlide', new ssNavigation('prevSlide'))
    .directive('ssNextPage',  new ssNavigation('nextPage'))
    .directive('ssPrevPage',  new ssNavigation('prevPage'));

})();