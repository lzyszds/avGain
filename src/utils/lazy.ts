import type { DirectiveBinding } from 'vue';
export default {
  mounted(el: HTMLImageElement, binding: DirectiveBinding) {
    const elImg = el.src
    el.src = window.lzyLazyImg
    const observe = new IntersectionObserver((entries) => {
      const { isIntersecting } = entries[0]
      if (isIntersecting == true) {

        setTimeout(() => {
          el.src = elImg
          observe.unobserve(el)
        }, binding.value * 500);
      }
    })
    observe.observe(el)
  }
}
