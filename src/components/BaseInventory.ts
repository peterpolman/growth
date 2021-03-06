import { Component, Vue } from 'vue-property-decorator';
import { mapGetters } from 'vuex';
import BaseItem from '@/components/BaseItem.vue';
import { BButton } from 'bootstrap-vue';
import BaseModal from '@/components/BaseModal.vue';
import draggable from 'vuedraggable';
import { Item } from '@/models/Item';
import { Account } from '@/models/Account';

@Component({
    name: 'BaseInventory',
    components: {
        'base-item': BaseItem,
        'b-button': BButton,
        'base-modal': BaseModal,
        'draggable': draggable,
    },
    computed: {
        ...mapGetters('account', {
            account: 'account',
        }),
        ...mapGetters('inventory', {
            items: 'items',
        }),
    },
})
export default class BaseInventory extends Vue {
    isOpen = false;
    items!: Item[];
    account!: Account;

    get inventory() {
        return this.items;
    }

    set inventory(inventory: Item[]) {
        this.$store.commit('inventory/changeOrder', { account: this.account, inventory });
    }

    open() {
        this.isOpen = !this.isOpen;
        this.$bvModal.show('inventory');
    }

    spawnScout() {
        this.$store.dispatch('markers/spawnScout', this.account);
    }
}
