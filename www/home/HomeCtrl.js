angular.module('co.tython.beacon.demo.home').controller('HomeCtrl', ['$http', '$ionicPopup', '$log', '$scope', '$rootScope', '$localForage', '$cordovaLocalNotification', function ($http, $ionicPopup, $log, $scope, $rootScope, $localForage, $cordovaLocalNotification) {

	$log.debug('HomeCtrl is loaded.');

	// Insert your custom REST Url here
	var restUrl = '';
	// Mock customer id using Salesforce contact id
	var contactId = '';	
	var regionInfo;	

	var alertPopup = function(elem){
		$ionicPopup.alert({
		    title: elem.Name,
		    template: elem.Description
		});
	}

	var callout = function(type, region){
		// Provide identifying info upon entering beacon region for tracking purposes		
		regionInfo = ( type === 'Entered' && typeof region !== 'undefined') ? '&uuid=' + region.uuid + '&major=' + region.major + '&minor=' + region.minor + '&identifier=' + region.identifier + '&type=' + type.toLowerCase() : '';		
		$http.get(restUrl + '?contactId=' + contactId + regionInfo)
			.then(function(response)
			{
				if (response && type === 'popup'){
					alertPopup(response.data)
						.then(function(res){
							// Closed
						});
				}
				else if (response && type === 'Entered'){
					$scope.sendPush(response.data.Description,type + ': ' + response.data.Name);
				}
				else if (response && type === 'Exited'){
					$scope.sendPush(response.data.Description,type + ': ' + response.data.Name);
				}
			});
	}	

	$scope.event = 'Waiting...';
	$scope.icon = 'ion-ios-clock-outline';

	$rootScope.regionEntered = false;
	$rootScope.regionExited = false;
	$rootScope.proximityImmediate = false;
	$rootScope.salesforceMode = {
		title : 'Salesforce Mode',
		enabled : false
	};

	$scope.resetStatusVariables = function () {
		$rootScope.regionEntered = false;
		$rootScope.regionExited = false;
		$rootScope.proximityImmediate = false;
	};

	$scope.sendPush = function(pushMessage,pushTitle) {
        var notificationTime = new Date();
        $cordovaLocalNotification.schedule({
            text: pushMessage,
            title: pushTitle,
            sound: "file://sounds/beep.caf"
        }).then(function () {
            console.log("The notification has been sent");
        });
    };

	$scope.updateMonitoringEvent = function () {
		$log.debug('updateMonitoringEvent()');

		$localForage.getItem('monitoring_events').then(function (monitoringEvents) {
			if (monitoringEvents[monitoringEvents.length-1] && monitoringEvents[monitoringEvents.length-1].region) {
				if (monitoringEvents[monitoringEvents.length-1].state === 'CLRegionStateInside'){
					$scope.event = 'In range!';
					$scope.icon = 'ion-eye';
					$scope.regionStatus = 'Entered';
				}
				else {
					$scope.event = 'Out of range :-(';
					$scope.icon = 'ion-eye-disabled';
					$scope.regionStatus = 'Exited';					
				}
				if ($rootScope.salesforceMode.enabled === false) {					
					$scope.sendPush($scope.event, 'Region ' + $scope.regionStatus);
				}
				else if ($scope.regionStatus === 'Entered' && $rootScope.regionEntered === false){					
					callout($scope.regionStatus, monitoringEvents[monitoringEvents.length-1].region);
					$rootScope.regionEntered = true;
				}
				else if ($scope.regionStatus === 'Exited' && $rootScope.regionExited === false){
					callout($scope.regionStatus);				
					$rootScope.regionExited = true;
				}
			}						
		});
	};

	$scope.updateRangingEvent = function () {
		
		$log.debug('updateRangingEvent()');

		$localForage.getItem('ranging_events').then(function (rangingEvents) {
			$scope.event = rangingEvents[rangingEvents.length-1].beacons[0].proximity;
			if ($scope.event === 'ProximityImmediate'){
				$scope.icon = 'ion-volume-high';
				if ($rootScope.proximityImmediate === false && $rootScope.salesforceMode.enabled === true){
					callout('popup');
					$rootScope.proximityImmediate = true;
				}				
			}
			else if ($scope.event === 'ProximityNear'){
				$scope.icon = 'ion-volume-medium';
			}
			else if ($scope.event === 'ProximityFar'){
				$scope.icon = 'ion-volume-low';
			}
			else {
				// Unknown
				$scope.icon = 'ion-ios-help-outline';
			}
		});
	};

	$log.debug('Subscribing for updates of monitoring events.');
	$scope.$on('updated_monitoring_events', $scope.updateMonitoringEvent);

	$log.debug('Subscribing for updates of ranging events.');
	$scope.$on('updated_ranging_events', $scope.updateRangingEvent);

}]);