[Watch the demo](https://youtu.be/Qi0Pz44qmic?si=-RG6M0DrsKKBNxH3)
![gif](/nptracer/np.gif)

<img src="/nptracer/nptracer.png">

<table width="100%">
  <tr>
    <td width="50%">
      <img src="/nptracer/shot1.png" style="width:100%;"/>
    </td>
    <td width="50%">
      <img src="/nptracer/shot2.png" style="width:100%;"/>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="/nptracer/shot3.png" style="width:100%;"/>
    </td>
    <td width="50%">
      <img src="/nptracer/shot6.png" style="width:100%;"/>
    </td>
  </tr>
</table>

# Overview

A Vulkan pathtracer enabling simultaneous PBR and NPR stylization in 3D scenes. Built on the OpenUSD Hydra Render Delegate framework and features packaging as a Houdini C++ plugin for use within any 3D pipeline's workflow. A Vulkan pathtracer enabling simultaneous PBR and NPR stylization in 3D scenes. Built on the OpenUSD Hydra Render Delegate framework and features packaging as a Houdini C++ plugin for use within any 3D pipeline's workflow.

# Features

## Non-Photorealistic Path Tracing

<img src="/nptracer/shot12.png"/>
<img src="/nptracer/shot13.png"/>

If you’re a fan of animation or games you might have come across non-photorealistic rendering techniques. Things like toon shading, cross hatching, and line drawing, all used to create expressive styles within various art mediums. However, while NPR looks great it has largely been unable to benefit from the myriad advancements in physically-based rendering techniques throughout the years. However, there have been recent developments in merging the two models, such as the method our tool is based on.

Our method is based on the SIGGRAPH 2024 paper _Stylized Rendering as a Function of Expectation_ by Rex West and Sayan Mukherjee. The paper bridges PBR and NPR by introducing the stylized rendering equation, applying stylization functions directly to the outgoing radiance of mesh vertices. For a very simple example, consider a greyscale effect, which just looks like outputting the luminance value from each point rather than the raw radiance RGB value. NPTracer features a wide variety of custom stylization functions, including but not limited to greyscale, toon, stripes, and cross-hatching.

## Authoring Tool

<img src="/nptracer/shot8.png">

NPTracer is a custom path-traced renderer built for Houdini Solaris. NPTracer is an artist-facing plug-in, allowing users to apply and composite stylized rendering effects directly within their Houdini scene, producing non-photorealistic results without leaving the Houdini environment.

Users will be able to choose from a selection of NPR stylization effects and apply them on a per object basis. The plug-in extracts USD scene data and sends it to our Vulkan path-tracer backend, which renders the results directly to the Houdini viewport. Our renderer implements a microfacet BRDF model, texture, normal, and roughness mappings, and several NPR stylization functions evaluated on a per-sample basis.

<table width="100%">
  <tr>
    <td width="50%"><img src="/nptracer/shot9.png" style="width:100%;"/></td>
    <td width="50%"><img src="/nptracer/shot10.png" style="width:100%;"/></td>
  </tr>
</table>

Using NPTracer really couldn’t be any easier. Simply open your USD scene in Houdini Solaris. Load up our custom render delegate. Click on any object within the stage, and choose which stylization you want to apply to it. Adhering to the original paper, different objects can have different stylizations applied to them as you can see here, seamlessly blending many different NPR effects all within the same scene.

<img src="/nptracer/shot15.png">

<table width="100%">
  <tr>
    <td width="50%">
      <img src="/nptracer/shot16.png" style="width:100%;"/>
    </td>
    <td width="50%">
      <img src="/nptracer/shot17.png" style="width:100%;"/>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="/nptracer/shot18.png" style="width:100%;"/>
    </td>
    <td width="50%">
      <img src="/nptracer/shot19.png" style="width:100%;"/>
    </td>
  </tr>
</table>

# Acknowledgements

Thank you to the team for making this happen:  
[Amy Liu](https://amyliu.dev/)  
[Bryce Joseph (me)](https://github.com/brycej217)
