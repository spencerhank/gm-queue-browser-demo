<template>
  <v-app id="inspire">
    <v-system-bar>
      <v-spacer></v-spacer>
    </v-system-bar>

    <v-main>
      <v-container class="py-8 px-6" fluid>
        <v-row>
          <v-col v-for="card in cards" :key="card" cols="12">
            <v-card>
              <v-list lines="three">
                <v-list-subheader :title="card"></v-list-subheader>

                <template
                  v-for="(n, index) in triageMessages"
                  :key="n.messageId"
                >
                  <v-list-item>
                    <template v-slot:prepend>
                      <v-avatar icon="mdi-exclamation" color="red"></v-avatar>
                    </template>

                    <v-list-item-title :title="n.payload.materialNumber"
                      >Material Number: {{ n.payload.materialNumber }} (Solace
                      MessageId: {{ n.messageId }})</v-list-item-title
                    >

                    <v-list-item-subtitle :title="n.payload"
                      >{{ n.payload }}<br /><v-btn
                        @click.prevent="resolveMessage(n)"
                        class="ma-2"
                        color="green"
                        >Mark as Resolved</v-btn
                      ></v-list-item-subtitle
                    >
                  </v-list-item>

                  <v-divider
                    v-if="index !== triageMessages.length - 1"
                    :key="`divider-${index}`"
                    inset
                  ></v-divider>
                </template>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { useSolaceStore } from "@/store/solace";

const solaceStore = useSolaceStore();
solaceStore.connectSession();

const triageMessages = computed(() => {
  let messagePayloads = [];
  solaceStore.messageResults.forEach((message) => {
    console.log(JSON.parse(message.getSdtContainer().getValue()));
    messagePayloads.push({
      solaceMessage: message,
      messageId: message.getGuaranteedMessageId(),
      payload: JSON.parse(message.getSdtContainer().getValue()),
    });
  });
  return messagePayloads;
});

onBeforeUnmount(() => {
  solaceStore.disconnect();
});

function resolveMessage(triageMessage) {
  console.log("Resolving message: " + triageMessage.messageId);
  solaceStore.deleteMessage(triageMessage.solaceMessage);
}

const cards = ["Material Data Verification Issues"];
</script>

<script>
export default {
  data: () => ({
    cards: ["Today", "Yesterday"],
    drawer: null,
    links: [
      ["mdi-inbox-arrow-down", "Inbox"],
      ["mdi-send", "Send"],
      ["mdi-delete", "Trash"],
      ["mdi-alert-octagon", "Spam"],
    ],
  }),
};
</script>
