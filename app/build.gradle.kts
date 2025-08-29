plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.example.infinity_2048"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.infinity_2048"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            // Release-specific settings
            isMinifyEnabled = false           // No code shrinking (ProGuard) yet
            isDebuggable = false             // Ensure release is not debuggable
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.appcompat)
    implementation(libs.material)
    implementation(libs.activity)
    implementation(libs.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.ext.junit)
    androidTestImplementation(libs.espresso.core)

    // Google AdMob for ads
    implementation("com.google.android.gms:play-services-ads:23.3.0")
}
