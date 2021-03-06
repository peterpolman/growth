import { Component, Vue, Prop } from 'vue-property-decorator';
import { mapGetters } from 'vuex';
import { BProgress, BButton } from 'bootstrap-vue';
import { User } from '@/models/User';
import { Goblin } from '@/models/Enemies';
import { Item, Weapon, Consumable } from '@/models/Item';
import firebase from '@/firebase';
import { Scout } from '@/models/Scout';

@Component({
    name: 'BaseAction',
    components: {
        'b-button': BButton,
        'b-progress': BProgress,
    },
    computed: {
        ...mapGetters('account', {
            account: 'account',
        }),
        ...mapGetters('markers', {
            selected: 'selected',
        }),
        ...mapGetters('equipment', {
            equipment: 'equipment',
            active: 'active',
        }),
        ...mapGetters('map', {
            map: 'map',
            tb: 'tb',
            mixers: 'mixers',
        }),
    },
})
export default class BaseAction extends Vue {
    @Prop() target!: Goblin | User | Scout;
    @Prop() main!: any | Item;
    @Prop() off!: any | Item;

    equipment!: { [slot: string]: Item };
    account!: Account;
    selected: any;
    activated = false;
    active!: any;
    combatTimer: any;
    time = 0;
    actionTimer: any;

    onMainClick() {
        this.$store.commit('equipment/activate', this.main);

        if (this.selected && !this.activated && this.main.type === 'weapon') {
            this.attack(this.active, this.selected);
        }
    }

    onOffClick() {
        this.$store.commit('equipment/activate', this.off);

        if (this.off.type === 'consumable') {
            this.consume(this.active, this.selected || this.account);
        }
    }

    async attack(weapon: Weapon, target: any) {
        if (target.ref) {
            this.activated = true;
            this.actionTimer = window.setTimeout(async () => {
                const damage = weapon.damage + Math.floor(Math.random() * 10);
                const hp = target.hitPoints - damage;

                if (hp < 0) {
                    this.$store.commit('markers/deselect');

                    this.dropLoot(target);
                    this.die(target);
                } else {
                    await target.ref.update({ hitPoints: hp });
                }

                window.clearInterval(this.actionTimer);
                this.activated = false;
            }, weapon.speed);
        }
    }

    consume(item: Consumable, target: any) {
        this.activated = true;
        this.combatTimer = window.setTimeout(async () => {
            if (target.ref) {
                const update = item.increase ? target[item.stat] + item.increase : target[item.stat] - item.decrease;

                await target.ref.child(item.stat).set(update);
            }
            window.clearTimeout(this.combatTimer);
            this.activated = false;
        }, item.speed);
    }

    async die(target: any) {
        await this.$store.dispatch('markers/remove', target);
        await target.ref.remove();
        await this.$store.dispatch('account/updateExperiencepoints', target);
    }

    async dropLoot(target: any) {
        const snap = await firebase.db.ref(`items`).once('value');
        const keys = Object.keys(snap.val());
        const index = Math.floor(Math.random() * keys.length);

        // Always drop some coin
        await this.$store.dispatch('inventory/place', {
            position: target.position,
            item: new Item({
                amount: Math.floor(Math.random() * 20) + 5,
                id: 'coinStack',
            }),
        });

        // Drop rate item 25%
        if (Math.random() < 0.25) {
            await this.$store.dispatch('inventory/place', {
                position: target.position,
                item: new Item({
                    amount: 1,
                    id: keys[index],
                }),
            });
        }
    }
}
