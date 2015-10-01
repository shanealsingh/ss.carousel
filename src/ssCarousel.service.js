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

