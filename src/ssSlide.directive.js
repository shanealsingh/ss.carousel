(function() {
  'use strict';


  // <ss-slide> Directive
  function ssSlide() {


    function link($scope, $element, $attrs, ctrl) {
      $element.addClass('ss-slide');
      if($scope.$last) { ctrl.ngRepeatDone(); }

      // Figure out why sometimes $destroy gets called more than once
      $scope.$on('$destroy', function() {
        ctrl.ngRepeatDone();
      });
    }


    return {
      restrict: 'EA',
      require: '^ssCarousel',
      link: link
    };
  }


  angular
    .module('ss.carousel')
    .directive('ssSlide', ssSlide);


})();