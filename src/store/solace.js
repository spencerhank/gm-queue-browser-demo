import { ref, watch } from 'vue';
import { defineStore } from 'pinia'
import solace, { MessageDeliveryModeType } from 'solclientjs';

export const useSolaceStore = defineStore('solaceStore', () => {
    let factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10_5;
    solace.SolclientFactory.init(factoryProps);

    let sessionUp = ref(false);

    const solaceClient = {}
    solaceClient.session = null;

    watch(
        () => sessionUp.value,
        (sessionUp) => {
            if (sessionUp) {
                startBrowsing()
            } else {
                disconnect()
            }
        }
    )

    function connectSession() {
        if (solaceClient.session !== null) {
            console.log('Session already initialized');
        }

        try {
            solaceClient.session = solace.SolclientFactory.createSession({
                url: 'wss://mr-connection-de86rbn9ibm.messaging.solace.cloud:443',
                vpnName: 'demo2',
                userName: 'solace-cloud-client',
                password: '2it6m3in48cngao9q014faoq8q',
            });
        } catch (error) {
            console.log(error)
        }

        solaceClient.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            console.log('=== Successfully connected and ready to subscribe. ===')
            sessionUp.value = true;
        });

        solaceClient.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            console.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
            sessionUp.value = false;
        });
        solaceClient.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            console.log('Disconnected.');
            sessionUp.value = false;
            solaceClient.subscribed = false;
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

    }

    return {
        connectSession
    }
});