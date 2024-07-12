import { ref, watch } from 'vue';
import { defineStore } from 'pinia'
import solace, { MessageDeliveryModeType, QueueDescriptor } from 'solclientjs';

export const useSolaceStore = defineStore('solaceStore', () => {
    let factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10_5;
    solace.SolclientFactory.init(factoryProps);

    let sessionUp = ref(false);
    let messageResults = ref([]);

    const solaceClient = {}
    solaceClient.session = null;

    watch(
        () => sessionUp.value,
        (sessionUp) => {
            if (sessionUp) {
                startBrowsing()
            } else {
                stopBrowsing()
            }
        }
    )

    function connectSession() {
        if (solaceClient.session !== null) {
            console.log('Session already initialized');
        }

        try {
            solaceClient.session = solace.SolclientFactory.createSession({
                url: 'wss://mr-connection-cnylcf8s69o.messaging.solace.cloud:443',
                vpnName: 'hankdemo',
                userName: 'solace-cloud-client',
                password: '',
            });
        } catch (error) {
            console.log(error)
        }

        solaceClient.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            console.log('=== Successfully connected and ready to subscribe. ===')
            sessionUp.value = true;
        });

        solaceClient.session.on(solace.SessionEventCode.REQUEST_ABORTED, function (sessionEvent) {
            console.log('Request Aborted')
        });

        solaceClient.session.on(solace.SessionEventCode.REQUEST_TIMEOUT, function (sessionEvent) {
            console.log('Request Timeout')
        });

        solaceClient.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            console.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
            sessionUp.value = false;
        });

        solaceClient.session.on(solace.SessionEventCode.ACKNOWLEDGED_MESSAGE, function (sessionEvent) {
            console.log('Message Ak\'d');

        });
        solaceClient.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            console.log('Disconnected.');
            sessionUp.value = false;
            if (solaceClient.session !== null) {
                solaceClient.session.dispose();
                solaceClient.session = null;
            }
        });

        solaceClient.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
            console.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
        });

        try {
            solaceClient.session.connect();
        } catch (error) {
            console.log(error.toString());
        }
    }

    function startBrowsing() {
        if (!sessionUp.value) {
            console.log("Session Null. Not Browsing")
        }


        let queueBrowser = solaceClient.session.createQueueBrowser({
            queueDescriptor: { name: 'Q.DCC.IM.Triage', type: solace.QueueType.QUEUE }
        });

        queueBrowser.on(solace.QueueBrowserEventName.UP, function () {
            queueBrowser.connected = true;
            console.log('=== Ready to receive messages. ===');
        });
        queueBrowser.on(solace.QueueBrowserEventName.CONNECT_FAILED_ERROR, function () {
            queueBrowser.connected = false;
            console.log('=== Error: the message browser could not bind to queue ===  Ensure this queue exists on the broker vpn');
            queueBrowser.disconnect()
        });

        queueBrowser.on(solace.QueueBrowserEventName.DOWN, function () {
            queueBrowser.consuming = false;
            console.log('=== The message consumer is now down ===');
        });
        queueBrowser.on(solace.QueueBrowserEventName.DOWN_ERROR, function () {
            queueBrowser.consuming = false;
            console.log('=== An error happened, the message consumer is down ===');
        });
        queueBrowser.on(solace.QueueBrowserEventName.GM_DISABLED, function () {
            console.log('=== An error happened, the message browser is GM_DISABLED ===');
        });

        queueBrowser.on(solace.QueueBrowserEventName.MESSAGE, function (message) {
            console.log(message.dump());
            messageResults.value.push(message);
        });

        queueBrowser.connect();
        queueBrowser.consuming = true;
        solaceClient.queueBrowser = queueBrowser


    }

    function stopBrowsing() {
        if (sessionUp.value) {
            if (solaceClient.queueBrowser.connected && solaceClient.queueBrowser.consuming) {
                solaceClient.queueBrowser.consuming = false;
                console.log("Disconnecting queue browser");
                try {
                    solaceClient.queueBrowser.disconnect();
                } catch (error) {
                    console.log("Error disconnecting queue browser");
                }
            } else {
                console.log("Can't disconnect browser, not connected")
            }
        } else {
            console.log("Can't disconnected queue. Not connected to Broker")
        }
    }

    function deleteMessage(message) {
        try {
            if (sessionUp.value && solaceClient.queueBrowser.connected) {
                console.log("Deleting message from queue");
                solaceClient.queueBrowser.removeMessageFromQueue(message);
                let updatedMessageResults = [];
                messageResults.value.forEach((m) => {
                    if (m !== message) {
                        updatedMessageResults.push(m);
                    }
                });
                // console.log(indexToRemove)
                messageResults.value = updatedMessageResults;

            } else {
                console.log("Unable to delete message. Session or Browser not connected");
            }
        } catch (error) {
            console.log(error);
        }

    }

    function disconnect() {
        if (solaceClient.session !== null) {
            sessionUp.value = false;
            try {
                solaceClient.session.disconnect();
            } catch (error) {
                console.log("Error discconnecting: " + error);
            }
        }
    }

    return {
        connectSession,
        disconnect,
        stopBrowsing,
        deleteMessage,
        messageResults
    }
});