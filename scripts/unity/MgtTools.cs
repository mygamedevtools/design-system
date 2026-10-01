// Copied into the scratch Unity project by scripts/unity.mjs. Renders unity/Examples/*.uxml
// with the kit theme to PNGs for the reference site.
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

public static class MgtTools
{
    const string Kit = "Assets/MyGamedevToolsUI";

    static string Output => System.Environment.GetEnvironmentVariable("MGT_OUT");

    public static void Render()
    {
        var theme = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>($"{Kit}/Theme/MyGamedevToolsTheme.tss");
        foreach (var (name, uxml) in new[] { ("gallery", "Gallery"), ("loading", "LoadingScreen") })
        {
            foreach (var light in new[] { false, true })
            {
                var file = Path.Combine(Output, $"unity-{name}-{(light ? "light" : "dark")}.png");
                RenderDocument(theme, $"Assets/Examples/{uxml}.uxml", light, file);
            }
        }
    }

    static void RenderDocument(ThemeStyleSheet theme, string uxmlPath, bool light, string path)
    {
        var texture = new RenderTexture(1280, 720, 24, RenderTextureFormat.ARGB32);
        texture.Create();
        var settings = ScriptableObject.CreateInstance<PanelSettings>();
        settings.themeStyleSheet = theme;
        settings.targetTexture = texture;
        settings.scaleMode = PanelScaleMode.ConstantPixelSize;
        settings.clearColor = true;

        var gameObject = new GameObject("Render");
        var document = gameObject.AddComponent<UIDocument>();
        document.panelSettings = settings;
        document.visualTreeAsset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(uxmlPath);
        document.rootVisualElement.style.flexGrow = 1;
        if (light)
            document.rootVisualElement.AddToClassList("mgt-theme-light");

        // Runtime panels normally update in the player loop; batch mode has none, so drive it.
        var utility = typeof(UIDocument).Assembly.GetTypes().First(t => t.Name == "UIElementsRuntimeUtility");
        const BindingFlags flags = BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
        for (var i = 0; i < 6; i++)
        {
            utility.GetMethod("UpdatePanels", flags, null, System.Type.EmptyTypes, null)?.Invoke(null, null);
            utility.GetMethod("RepaintPanels", flags, null, new[] { typeof(bool) }, null)?.Invoke(null, new object[] { true });
            utility.GetMethod("RenderOffscreenPanels", flags, null, System.Type.EmptyTypes, null)?.Invoke(null, null);
        }

        RenderTexture.active = texture;
        var pixels = new Texture2D(texture.width, texture.height, TextureFormat.RGBA32, false);
        pixels.ReadPixels(new Rect(0, 0, texture.width, texture.height), 0, 0);
        pixels.Apply();
        RenderTexture.active = null;
        File.WriteAllBytes(path, pixels.EncodeToPNG());
        Debug.Log($"[mgt] rendered {path}");
        Object.DestroyImmediate(gameObject);
    }
}
