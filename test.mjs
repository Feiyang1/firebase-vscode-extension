import firebaseCli from 'firebase-tools';

(async () => {
    // const apps = await firebaseCli.apps.list('web', {
    //     project: 'friendlyeats-2020-io'
    // });

    // console.log(apps)

    await firebaseCli.init();
})();