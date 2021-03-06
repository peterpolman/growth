import { Component, Vue, Prop } from 'vue-property-decorator';
import { mapGetters } from 'vuex';
import { Item } from '@/models/Item';
import { Account } from '@/models/Account';
import { BButton, BPopover } from 'bootstrap-vue';

@Component({
    name: 'BaseItem',
    components: {
        'b-button': BButton,
        'b-popover': BPopover,
    },
    computed: {
        ...mapGetters('account', {
            account: 'account',
        }),
        ...mapGetters('inventory', {
            inventory: 'items',
        }),
    },
})
export default class BaseItem extends Vue {
    @Prop() item!: Item;
    @Prop() equipped!: boolean;
    @Prop() dropable!: boolean;

    account!: Account;

    equip() {
        this.$store.dispatch('inventory/equip', { account: this.account, item: this.item });
    }

    unequip() {
        this.$store.dispatch('inventory/unequip', { account: this.account, item: this.item, destroy: false });
    }

    drop() {
        this.$store.dispatch('inventory/drop', { account: this.account, item: this.item });
    }
}
