(function(angular, Hammer, TweenMax) {
  'use strict';


  // Sanity Check
  if(!angular) { console.error('angular is not defined'); }
  if(!Hammer) { console.error('Hammer.js is not defined'); }


  ssCarousel.$inject = ['$window', '$document', '$timeout', '$ssCarousel'];
  function ssCarousel($window, $document, $timeout, $ssCarousel) {


    function link(scope, element, attrs, ctrl) {

      // Slide delta. Used for CSS animations
      var slideDelta;

      // Merge default options and scope options
      var options = angular.merge({}, defaultOptions, scope.options);

      // Cached <slide> dom elements
      var slides;

      // Is the directive initalized?
      var initalized;

      // Scrollable container
      var container = angular.element(element[0].querySelector(scope.containerSelector));

      // Snap Points
      var snapPoints = [];

      // Carousel
      var $currentCarousel;

      // Reference to the carousel control objectf rom the Carousel service
      var control;


      // <slide> directive calls this method when when ngRepeat has finished
      // rendering dom elements so we can get access to width, ect.

      scope.ngRepeatDone = function() {
        // Get DOM slides
        slides = element[0].querySelectorAll('.ss-slide');
        if(!initalized) {
          initalized = true;
          element.addClass('initalized');
          initCarouselService();
        }

        // Initalize values
        scope.refresh();

        // Now that values are know go to the inital index
        control.toIndex(control.slideIndex);
      };

 
      function initCarouselService() {
        $currentCarousel = $ssCarousel.add(ctrl.id);
        control = $currentCarousel.control;

        // Listen for refresh
        $currentCarousel.refresh(function() {
          scope.refresh();
        });

        // Callback for when slideIndexChanges from service
        $currentCarousel.indexChanged(function(type) {
          changeSlide();
        });  

        // Enable Carousel
        $currentCarousel.onEnable(function() {
          initHammer();
        });

        // Disable Carousel
        $currentCarousel.onDisable(function() {
          destroyHammer();
        });
      }


      // Recalculates sizing for the carousel
      scope.refresh = function() {
        if(!slides[0]) {
          console.error('Define a carousel selector');
          return;
        }


        // Get the style property for the slide and element
        var slideStyle = slides[0].currentStyle || $window.getComputedStyle(slides[0]);

        // Get the style property for the element
        var elementStyle = element[0].currentStyle || $window.getComputedStyle(element[0]);

        // Get element width
        var elementWidth = parseFloat(elementStyle.width.replace('px', ''));

        var slideWidth = parseFloat(slideStyle.width.replace('px', ''));
        control.slideMargin = parseFloat(slideStyle.marginRight.replace('px', ''));


        // Computer slide width (px). The full width is width + margin
        control.slideWidth = slideWidth + control.slideMargin;

        control.slideLength = slides.length;

        // Calculate slide delta as percent
        slideDelta = (control.slideWidth / elementWidth) * 100;

        // Compute the amount of visible slides in container.
        control.visibleSlides = Math.ceil(elementWidth / control.slideWidth);

        // Compute number of pages
        control.pageLength = Math.ceil(control.slideLength / control.visibleSlides);


        // Recalculate snap points
        calcSnapPoints();
      };


      // Change the slide
      function changeSlide(resize, type) {

        translateX(-(slideDelta * control.slideIndex), '%');


        // Calculate the current position of the slider (px) so
        // when dragging it has the correct offset (see below Hammer.panleft or Hammer.panright)
        resetPosition = -(control.slideWidth * control.slideIndex);
      }


      //////////////////////////////
      // Drag and swipe functions //
      //////////////////////////////

      var hammer;

      // Current offset for the carousel
      var resetPosition = 0;

      // Current position of the carousel
      var positionX = 0;

      // When users reaches the begining or the end of the carousel
      // add some friction so they cannot drag the carousel off screen
      var friction = 0.3;

      // Max amount that the carousel can be dragged
      var maxWidth;

      // Check if swipe is detected see panend/pancancel
      var swipe = false;

      var flag = false;

      var lastX = 0;

      initHammer();


      // Init hammer
      function initHammer() {
        if(hammer) { return; }
        hammer = new Hammer(element[0], {
          drag_block_horizontal: false,
          drag_block_vertical: false,
          domEvents: true
        });


        // hammer.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 5 });
        hammer.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 9, velocity: 0.25 });
        hammer.on('panstart', panStart);
        hammer.on('panleft panright', onPan);
        hammer.on('panend pancancel', onPanEnd);
        hammer.on('swipeleft swiperight', onSwipe);
      }


      // Start drag handler
      // Remover pointer events so the click handler on a list item inside
      // the carousel does not get fired when user is dragging and releases the mouse

      function panStart() {
        element.css('pointer-events', 'none');
        maxWidth = ((control.slideWidth) * (control.slideLength-control.visibleSlides));
        container.addClass('ss-noanimate');
      }


      // Drag handler
      function onPan(e) {
        positionX = resetPosition + e.deltaX;

        if(positionX > 0) {
          positionX *= friction;
        } else if(positionX <= -maxWidth) {
          if(!flag) {
            flag = true;
            lastX = e.deltaX;
          }

          var diff = (e.deltaX - lastX) * -friction;
          positionX = resetPosition + (lastX - diff);
        }

        translateX(positionX, 'px');  
      }

      
      // Drag Ended
      function onPanEnd() {
        element.css('pointer-events', 'initial');
        container.removeClass('ss-noanimate');

        // If a swipe is detected do not change slide
        if(swipe) { swipe = false; return; }

        var sp = getSnapPoint();
        if(sp === control.slideIndex || flag) {
          changeSlide();
        } else {
          scope.$apply(function() {
            control.toIndex(sp);
          });
        }

        // Reset Flag
        flag = false;
      }


      // Swipe handler 
      function onSwipe(e) {
        swipe = true;
        flag = false;

        var sp = getSnapPoint();


        if(sp === 0 && e.type === 'swiperight') {
          changeSlide();
          return;
        }


        if(positionX < -maxWidth && e.type === 'swipeleft') {
          changeSlide();
          return;
        }


        scope.$apply(function() {
          $timeout(function() {
            if(e.type === 'swipeleft') {
              if(options.onSwipe === $ssCarousel.onSwipe.Slide) {
                control.nextSlide();
              } else {
                control.nextPage();
              }
            } else {
              if(options.onSwipe === $ssCarousel.onSwipe.Slide) {
                control.prevSlide();
              } else {
                control.prevPage();
              }
            }
          });
        });
      }


      // Send psoition values back to and subscribers
      function updatePosition(x) {
        var slidePercent;
        var pagePercent;
        
        slidePercent = -(x / control.slideWidth);
        pagePercent = -(x / (control.slideWidth * control.visibleSlides));


        if(slidePercent === 0) { slidePercent = 0; }
        if(pagePercent === 0)  { pagePercent  = 0; }


        $currentCarousel.positionChanged({
          slidePercent: slidePercent,
          pagePercent: pagePercent
        });
      }


      // Calculate snap points
      function calcSnapPoints() {
        var i = 0;
        for(; i < control.slideLength; i++) {
          snapPoints.push(-i * control.slideWidth);
        }
      }


      // Gets the best snap point and returns the index of the slide
      function getSnapPoint() {
        // Store each difference between current position and each snap point.
        var currentDiff;

        // Store the current best difference.
        var minimumDiff;

        // Best snap position.
        var snapIndex;

        // Loop through each snap location
        // and work out which is closest to the current position.
        var i = 0;
        for(; i < snapPoints.length; i++) {
          // Calculate the difference.
          currentDiff = Math.abs(positionX - snapPoints[i]);
          
          // Works out if this difference is the closest yet.
          if(minimumDiff === undefined || currentDiff < minimumDiff) {
            minimumDiff = currentDiff;
            snapIndex = i;
          }
        }
        return snapIndex;
      }


      function destroyHammer() {
        if(hammer) {
          hammer.destroy();
          hammer = null;
        }
      }


      /////////////////////
      // Resize Carousel //
      /////////////////////


      // Resizes the carousel
      // Since the transition is defined in CSS and we don't want to animate the carousel
      // during resize add a temporarily class thats disables transition.
      var rt;
      var animate = true;
      var _visibleSlides;
      angular.element($window).bind('resize', function() {
        if(animate) {
          animate = false;
          container.addClass('ss-noanimate');
        }


        // Recalculate slide dimentions
        scope.refresh();

        // Only resize if the amount fo visible items has changed
        if(control.visibleSlides !== _visibleSlides) {
          control.toIndex(control.slideIndex, true);
          _visibleSlides = control.visibleSlides;
        }
        

        $timeout.cancel(rt);
        rt = $timeout(function() {
          container.removeClass('ss-noanimate');
          animate = true;
        }, 500);
      });


      // Add .ss-noanimate class to remove animation when browser is resizing
      // or when user just wants to disable it.
      var css = '.ss-noanimate { transition: none !important; }';
      var head = $document.find('head')[0];
      angular.element(head).append('<style>' + css + '</style>');


      // Clean up
      scope.$on('$destroy', function() {
        angular.element($window).unbind('resize');
        destroyHammer();
        $ssCarousel.destroy(ctrl.id);
      });

      //////////////////////
      // Helper Functions //
      //////////////////////

      function translateX(x, unit) {
        container.css('-webkit-transform', 'translateX(' + x + unit + ')');
        container.css('-moz-transform', 'translateX(' + x + unit + ')');
        container.css('-ms-transform', 'translateX(' + x + unit + ')');
        container.css('transform', 'translateX(' + x + unit + ')');
      }
    }

    // Default options
    var defaultOptions = {
      tweenOptions: {
        slide: {
          duration: 0.75,
          ease: 'Power3.easeOut'
        },
        page: {
          duration: 0.75,
          ease: 'Power3.easeOut'
        },
        snap: {
          duration: 0.75,
          ease: 'Power3.easeOut'
        }
      },
      snap: false,
      swipe: false,
      onSwipe: $ssCarousel.onSwipe.Page,
    };

    return {
      restrict: 'AE',
      scope: {
        id: '@',
        containerSelector: '@',
        options: '=?'
      },
      controller: 'ssCarouselCtrl',
      link: link
    };
  }


  angular
    .module('ss.carousel', [])
    .directive('ssCarousel', ssCarousel);


})(window.angular, window.Hammer, window.TweenMax);


(function() {
  'use strict';


  ssCarouselCtrl.$inject = ['$scope'];
  function ssCarouselCtrl($scope) {
    var self = this;

    // If no id is present create a dumy one so other components
    // can communicate with the Carousel Service
    $scope.id = $scope.id || Math.random().toString(36).substring(7);
    self.id = $scope.id;

    self.ngRepeatDone = function() { $scope.ngRepeatDone(); };
    self.refresh = function() { $scope.refresh(); };
  }


  angular
    .module('ss.carousel')
    .controller('ssCarouselCtrl', ssCarouselCtrl);

})();
(function() {
  'use strict';


  $ssCarousel.$inject = ['$q'];
  function $ssCarousel($q) {


    var Carousel = {};

    // Carousel instances
    var instances = {};

    // promises
    var promises = {};

    // Constants used for determining animation properties
    // for animating with TweenMax
    Carousel.const = {
      TWEEN_SLIDE: 'slide',
      TWEEN_PAGE : 'page',
      TWEEN_SNAP : 'snap'
    };


    Carousel.onSwipe = {
      Page : 0,
      Slide: 1
    };


    // Used in directives to add a new Carousel instance
    Carousel.add = function(id) {
      if(!id) {
        console.error('Carousel instance must have an id');
        return;
      }

      // Check if carousel already exists
      var carouselExists = instances[id] || false;
      if(carouselExists) {
        console.error('Carousel [' + id + '] already exists');
      }

      // Create new Carousel instance and add it to 'instances' object
      var instance = new Constructor();
      instances[id] = instance;

      // If a there are items waiting for the Carousel to be initalized then
      // resolve them
      if(promises[id]) {
        angular.forEach(promises[id], function(promise) {
          promise.resolve(instance.control);
        });
        delete promises[id];
      }

      return instance;
    };


    // If someone is trying to get the carousel and it has not yet
    // been initalized by the directive, then send back a promise or
    // if it has been initalized resolve it
    Carousel.get = function(id) {
      var defer = $q.defer();
      var instance = instances[id] || false;

      console.log('LOOOOO');

      if(!instance) {
        if(!promises[id]) {
          promises[id] = [];
        }

        promises[id].push(defer);
        return defer.promise;
      }

      defer.resolve(instance.control);
      return defer.promise;
    };


    // Destroy a Carousel instance
    Carousel.destroy = function(id) {
      var instance = instances[id];

      angular.forEach(instance.onDestroyCallbacks, function(callback) {
        callback();
      });

      instance.onSlideChangedCallbacks     = 
      instance.onPageChangedCallbacks      =
      instance.onPositionChangedCallbacks  = 
      instance.onDestroyCallbacks          = undefined;
      delete instances[id];
      instance = undefined;
    };


    var Constructor = function() {

      // Self is what the Carousel directive has access to
      var self = this;


      self.onSlideChangedCallbacks = [];
      self.onPageChangedCallbacks = [];
      self.onPositionChangedCallbacks = [];
      self.onDestroyCallbacks = [];


      self.positionChanged = function(data) {
        angular.forEach(self.onPositionChangedCallbacks, function(callback) {
          callback.call(control, data);
        });
      },


      self.refresh = function(callback) {
        self.refresh = callback;
      };


      self.indexChanged = function(callback) {
        self.indexChangedCallback = callback;
      };


      self.onEnable = function(callback) {
        self.onEnableCallback = callback;
      };


      self.onDisable = function(callback) {
        self.onDisableCallback = callback;
      };


      self.toIndex = function(index, forceUpdate) {
        if(!control.enabled) { return; }
        var _oldSlideIndex = self.control.slideIndex;
        if(index >= (self.control.slideLength - self.control.visibleSlides)) {
          self.control.slideIndex = (self.control.slideLength - self.control.visibleSlides);
        } else if(index < 0) {
          self.control.slideIndex = 0;
        } else {
          self.control.slideIndex = index;
        }


        // Calculate current pageIndex
        var pageIndex = 0;
        var pageChanged = false;


        var j = 0;
        for(var i =0; i < self.control.slideIndex; i++) {
          if(j === self.control.visibleSlides-1) {
            pageIndex++;
            j = 0;
          } else {
            j++;
          }
        }


        if(parseInt(control.slideLength / control.visibleSlides) !== (control.slideLength / control.visibleSlides)) {
          if(control.slideIndex === control.slideLength - control.visibleSlides) {
            pageIndex++;
          }
        }


        // If page index has changed recalculate it
        if(pageIndex !== self.control.pageIndex) {
          // Reassign pageIndex because it has changed
          pageChanged = true;
          self.control.pageIndex = pageIndex;
          angular.forEach(self.onPageChangedCallbacks, function(callback) {
            callback.call(control, control.pageIndex);
          });
        }

        var indexChanged = _oldSlideIndex !== self.control.slideIndex;
        if(indexChanged || forceUpdate) {
          if(indexChanged) {
            angular.forEach(self.onSlideChangedCallbacks, function(callback) {
              callback.call(control, control.slideIndex);
            });
          }

          var type = pageChanged ? Carousel.const.TWEEN_PAGE : Carousel.const.TWEEN_SLIDE;
          self.indexChangedCallback(type);
        }
      };


      ////////////
      // Public //
      ////////////

      // This control is what gets passed to an item getting the Carousel Instance
      var control = {

        // Current slide index
        slideIndex: 0,

        // Amount of slides in the carousel
        slideLength: 0,
        
        // Outer with of the slide. Computed porperty: (slideWidth + slideMargin)
        slideWidth: 0,

        // Slide margin
        slideMargin: 0,

        // Current page length
        pageLength: 0,

        // Current page index
        pageIndex: 0,

        // Amount of visible slides in the Carousel
        visibleSlides: 0,

        // Enabled
        enabled: true,


        //////////////
        //  Methods //
        //////////////

        // Go to next Slide
        nextSlide: function() {
          self.toIndex(control.slideIndex + 1);
          return control.slideIndex;
        },


        // Go to next Slide
        prevSlide: function() {
          self.toIndex(control.slideIndex - 1);
          return control.slideIndex;
        },


        // Go to next page
        nextPage: function() {
          self.toIndex((control.pageIndex + 1) * control.visibleSlides);
          return control.pageIndex;
        },


        // Go to previous page
        prevPage: function() {
          self.toIndex((control.pageIndex - 1) * control.visibleSlides);
          return control.pageIndex;
        },


        // Go to a specific slide by index
        toIndex: function(slideIndex, forceUpdate) {
          self.toIndex(slideIndex, forceUpdate);
          return control.slideIndex;
        },


        // Go to a specific page by index
        toPage: function(pageIndex) {
          self.toIndex(pageIndex * control.visibleSlides);
          return control.pageIndex;
        },


        // Reccalculate slide values
        refresh: function() {
          self.refresh();
        },


        // Disable carousel
        disable: function() {
          control.enabled = false;
          self.onDisableCallback();
        },


        // Enable Carousel
        enable: function() {
          control.enabled = true;
          self.onEnableCallback();
        },


        ///////////////
        // Callbacks //
        ///////////////
        onPositionChanged: function(callback) {
          self.onPositionChangedCallbacks.push(callback);
        },

        onSlideChanged: function(callback) {
          self.onSlideChangedCallbacks.push(callback);
        },

        onPageChanged: function(callback) {
          self.onPageChangedCallbacks.push(callback);
        },

        onDestroy: function(callback) {
          self.onDestroyCallbacks.push(callback);
        },

        //////////////////
        // Maid Service //
        //////////////////
        unbindPositionChanged: function(callback) {
          self.onPositionChangedCallbacks = unbind(self.onPositionChangedCallbacks, callback);
        },

        unbindSlideChanged: function(callback) {
          self.onSlideChangedCallbacks = unbind(self.onSlideChangedCallbacks, callback);
        },

        unbindPageChanged: function(callback) {
          self.onPageChangedCallbacks = unbind(self.onPageChangedCallbacks, callback);
        },
      };


      function unbind(callBackArray, callback) {
        var newCallbacks = callBackArray.filter(function(_callback) {
          if(callback === _callback) {
            return false;
          }

          return true;
        });
        return newCallbacks;
      }

      self.control = control;
    };

    return Carousel;
  }


  angular
    .module('ss.carousel')
    .factory('$ssCarousel', $ssCarousel);


})();


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