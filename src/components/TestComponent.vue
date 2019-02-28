<template>
    <div class='test' style="width:500; height:500">
        <h1 class='title'>Accident detail {{ title }} </h1>
        <p>Description of the accident goes like this.</p>
        <!-- <a class="button is-dark" style="position:absolute" @click="cx=cx+10">Button</a> -->
        <svg>
            <circle :cx='cx' :cy='cy' r=50></circle>
        </svg>
    </div>
</template>

<script>
    export default {
        props: ['cx','cy'],
        data() {
            return {
        //         x: "10",
        //         y: "10",
                title: "I survived."
            }
        },
        // computed: {
        //     updateMe() {
        //         console.log("updateMe")
        //         this.x = this.cx.toString();
        //         this.y = this.cy.toString();
        //         console.log(this.x, this.y);
        //     }
        // }
    }
</script>

<style scoped>
.test {
    position: absolute;
    border: 1px solid black;
    background-color: #eeeeeeaa;
    border-radius: 42px;
}
</style>