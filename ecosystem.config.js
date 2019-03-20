module.exports = {
    apps: [{
        name: "gini",
        script: "./index.js",
        env: {
            NODE_ENV: "development"
        },
        env_test: {
            NODE_ENV: "test",
        },
        env_staging: {
            NODE_ENV: "staging",
        },
        env_production: {
            NODE_ENV: "production",
            gini_user_jsonAuthToken: "user7",
            gini_partner_jsonAuthToken: "partner7",
            gini_driver_jsonAuthToken: "driver7",
            gini_system_id: "system"
        }
    }]
}