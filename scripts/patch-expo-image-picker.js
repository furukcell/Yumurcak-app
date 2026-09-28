const fs = require('fs');
const path = require('path');

const packageRoot = path.join(__dirname, '..', 'node_modules', 'expo-image-picker');
const packageJsonPath = path.join(packageRoot, 'package.json');
const contractPath = path.join(
  packageRoot,
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'imagepicker',
  'contracts',
  'ImageLibraryContract.kt'
);

if (!fs.existsSync(packageJsonPath) || !fs.existsSync(contractPath)) {
  console.log('[expo-image-picker patch] package not installed; skipping.');
  process.exit(0);
}

const version = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
if (version !== '17.0.11') {
  throw new Error(
    '[expo-image-picker patch] Expected expo-image-picker 17.0.11, found ' + version
  );
}

let source = fs.readFileSync(contractPath, 'utf8');

if (source.includes('Image library result handling failed')) {
  console.log('[expo-image-picker patch] already applied.');
  process.exit(0);
}

const importNeedle = 'import android.net.Uri\\n';
const importReplacement = 'import android.net.Uri\\nimport android.util.Log\\n';

if (!source.includes(importNeedle)) {
  throw new Error('[expo-image-picker patch] Could not find the expected Uri import.');
}

const oldParseResult = `  override fun parseResult(input: ImageLibraryContractOptions, resultCode: Int, intent: Intent?) =
    if (resultCode == Activity.RESULT_CANCELED) {
      ImagePickerContractResult.Cancelled
    } else {
      intent?.takeIf { resultCode == Activity.RESULT_OK }?.getAllDataUris()?.let { uris ->
        if (input.options.allowsMultipleSelection) {
          val results = uris.map { uri ->
            uri.toMediaType(contentResolver) to uri
          }.let {
            if (input.options.selectionLimit > 0) {
              it.take(input.options.selectionLimit)
            } else {
              it
            }
          }

          ImagePickerContractResult.Success(results)
        } else {
          if (intent.data != null) {
            intent.data?.let { uri ->
              val type = uri.toMediaType(contentResolver)
              ImagePickerContractResult.Success(listOf(type to uri))
            }
          } else {
            uris.firstOrNull()?.let { uri ->
              val type = uri.toMediaType(contentResolver)
              ImagePickerContractResult.Success(listOf(type to uri))
            } ?: ImagePickerContractResult.Error
          }
        }
      } ?: ImagePickerContractResult.Error
    }`;

const newParseResult = `  override fun parseResult(input: ImageLibraryContractOptions, resultCode: Int, intent: Intent?) =
    try {
      if (resultCode == Activity.RESULT_CANCELED) {
        ImagePickerContractResult.Cancelled
      } else {
        intent?.takeIf { resultCode == Activity.RESULT_OK }?.getAllDataUris()?.let { uris ->
          if (input.options.allowsMultipleSelection) {
            val results = uris.map { uri ->
              uri.toMediaType(contentResolver) to uri
            }.let {
              if (input.options.selectionLimit > 0) {
                it.take(input.options.selectionLimit)
              } else {
                it
              }
            }

            ImagePickerContractResult.Success(results)
          } else {
            if (intent.data != null) {
              intent.data?.let { uri ->
                val type = uri.toMediaType(contentResolver)
                ImagePickerContractResult.Success(listOf(type to uri))
              }
            } else {
              uris.firstOrNull()?.let { uri ->
                val type = uri.toMediaType(contentResolver)
                ImagePickerContractResult.Success(listOf(type to uri))
              } ?: ImagePickerContractResult.Error
            }
          }
        } ?: ImagePickerContractResult.Error
      }
    } catch (e: Exception) {
      Log.e("ExpoImagePicker", "Image library result handling failed", e)
      ImagePickerContractResult.Error
    }`;

if (!source.includes(oldParseResult)) {
  throw new Error(
    '[expo-image-picker patch] Expected ImageLibraryContract.kt source was not found; refusing to patch an unknown version.'
  );
}

source = source.replace(importNeedle, importReplacement);
source = source.replace(oldParseResult, newParseResult);

fs.writeFileSync(contractPath, source, 'utf8');
console.log('[expo-image-picker patch] applied to expo-image-picker ' + version + '.');
