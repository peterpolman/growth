import { Vue, Component } from 'vue-property-decorator';
import { mapGetters } from 'vuex';
import { BButton } from 'bootstrap-vue';

import { User } from '@/models/User';
import { Item } from '@/models/Item';
import { Ward } from '@/models/Ward';
import { Goblin } from '@/models/Enemies';
import { Loot } from '@/models/Loot';
import { Account } from '@/models/Account';

import BaseFog from '@/components/BaseFog.vue';
import BaseMap from '@/components/BaseMap.vue';
import BaseAction from '@/components/BaseAction.vue';
import BaseProfile from '@/components/BaseProfile.vue';
import BaseInventory from '@/components/BaseInventory.vue';
import BaseUser from '@/components/characters/User.vue';
import BaseGoblin from '@/components/characters/Goblin.vue';
import BaseWard from '@/components/characters/Ward.vue';
import BaseLoot from '@/components/BaseLoot';

@Component({
    name: 'home',
    components: {
        'b-button': BButton,
        'base-map': BaseMap,
        'base-profile': BaseProfile,
        'base-action': BaseAction,
        'base-inventory': BaseInventory,
        'human': BaseUser,
        'goblin': BaseGoblin,
        'loot': BaseLoot,
        'ward': BaseWard,
        'base-fog': BaseFog,
    },
    computed: {
        ...mapGetters('map', {
            map: 'map',
            tb: 'tb',
        }),
        ...mapGetters('markers', {
            all: 'all',
            selected: 'selected',
        }),
        ...mapGetters('equipment', {
            equipment: 'equipment',
            active: 'active',
        }),
        ...mapGetters('account', {
            account: 'account',
        }),
    },
})
export default class Home extends Vue {
    account!: Account;
    map!: any;
    tb!: any;
    all!: { [id: string]: Goblin | User | Loot | Ward };
    selected!: Goblin | User;
    active!: Item;

    onMapClick(event: any) {
        const intersect = this.tb.queryRenderedFeatures(event.point)[0];

        if (intersect) {
            this.handleMeshClick(intersect.object);
        } else {
            this.handleMapClick(event);
        }
    }

    handleMeshClick(object: any) {
        if (object.name !== 'fog') {
            const data = this.getUserData(object).userData;

            this.$store.commit('markers/select', data.id);
        }
    }

    async handleMapClick(e: any) {
        if (this.active) {
            switch (this.active.slug) {
                case 'ward':
                    await this.$store.dispatch('map/addWard', { account: this.account, position: e.lngLat });
                    this.$store.dispatch('inventory/unequip', {
                        account: this.account,
                        item: this.active,
                        destroy: true,
                    });
                    this.$store.commit('equipment/deactivate');
                    break;
            }
        } else {
            this.$store.dispatch('markers/deselect');
        }
    }

    getUserData(object: any) {
        if (typeof object.userData.id != 'undefined') {
            return object;
        } else if (typeof object.parent.userData.id != 'undefined') {
            return object.parent;
        } else if (typeof object.parent.parent.userData.id != 'undefined') {
            return object.parent.parent;
        } else if (typeof object.parent.parent.parent.userData.id != 'undefined') {
            return object.parent.parent.parent;
        }
    }

    async toggleLockCamera() {
        await this.$store.dispatch('account/toggleLockCamera');
        this.map.dragPan[this.account.lockCamera ? 'disable' : 'enable']();
        this.map.setCenter([this.account.position.lng, this.account.position.lat]);
    }

    logout() {
        this.$router.replace('logout');
    }
}
